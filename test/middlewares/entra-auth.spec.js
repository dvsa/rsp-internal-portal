import createJWKSMock from 'mock-jwks';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import config from '../../src/server/config';
import AuthService, { authService } from '../../src/server/services/auth.service';
import authorization from '../../src/server/middlewares/authorization.middleware';
import * as main from '../../src/server/controllers/main.controller';
import { AuthorizationError, AuthorizationErrorCode } from '../../src/server/utils/authorisationError';

chai.use(chaiAsPromised);

describe('Entra ID token verification', () => {
  const tenant = 'test-tenant';
  const client = 'test-client';
  const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`;
  const jwks = createJWKSMock('https://login.microsoftonline.com', `/${tenant}/discovery/v2.0/keys`);
  let service;

  beforeEach(() => {
    sinon.stub(config, 'tenantId').returns(tenant);
    sinon.stub(config, 'clientId').returns(client);
    jwks.start();
    service = new AuthService();
  });

  afterEach(async () => {
    sinon.restore();
    await jwks.stop();
  });

  const token = (overrides = {}) => jwks.token(Object.fromEntries(
    Object.entries({
      sub: 'test-user',
      iss: issuer,
      aud: client,
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['BankingFinance'],
      ...overrides,
    }).filter(([, value]) => value !== undefined),
  ));

  it('returns the verified claims', async () => {
    expect(await service.verifyToken(token())).to.include({
      sub: 'test-user',
      iss: issuer,
      aud: client,
    });
  });

  it('rejects invalid signatures, issuer and audience', async () => {
    const [header, , signature] = token().split('.');
    const payload = Buffer.from(JSON.stringify({ sub: 'other-user' })).toString('base64url');
    await expect(service.verifyToken(`${header}.${payload}.${signature}`))
      .to.be.rejectedWith(AuthorizationError);
    await expect(service.verifyToken(token({ aud: 'other-client' })))
      .to.be.rejectedWith(AuthorizationError);
    await expect(service.verifyToken(token({ iss: 'https://other.example.test' })))
      .to.be.rejectedWith(AuthorizationError);
  });

  it('rejects missing expiry or subject and distinguishes expired tokens', async () => {
    await expect(service.verifyToken(token({ exp: undefined })))
      .to.be.rejectedWith(AuthorizationError);
    await expect(service.verifyToken(token({ sub: undefined })))
      .to.be.rejectedWith(AuthorizationError);
    await expect(service.verifyToken(token({ exp: 1 })))
      .to.eventually.be.rejectedWith(AuthorizationError)
      .and.have.property('code', AuthorizationErrorCode.EXPIRED_TOKEN);
  });

  it('looks up the account in the MSAL cache before refreshing', async () => {
    const account = { homeAccountId: 'test-account' };
    const getAccount = sinon.stub().resolves(account);
    sinon.stub(service.clientApp, 'getTokenCache').returns({ getAccountByHomeId: getAccount });
    const acquire = sinon.stub(service.clientApp, 'acquireTokenSilent').resolves({ idToken: 'new-token' });

    expect(await service.refreshAccessToken('test-account')).to.deep.equal({ idToken: 'new-token' });
    sinon.assert.calledOnceWithExactly(getAccount, 'test-account');
    sinon.assert.calledWith(acquire, sinon.match({ account }));
    getAccount.resolves(null);
    expect(await service.refreshAccessToken('missing-account')).to.equal(null);
    sinon.assert.calledOnce(acquire);
  });
});

describe('Entra login and authorization', () => {
  let request;
  let response;
  let next;
  let verify;
  let refresh;

  beforeEach(() => {
    sinon.stub(config, 'urlRoot').returns('');
    sinon.stub(config, 'doRoleChecks').returns(true);
    sinon.stub(config, 'isDevelopment').returns(false);
    verify = sinon.stub(authService, 'verifyToken');
    refresh = sinon.stub(authService, 'refreshAccessToken');
    request = {
      session: { rsp_subject: 'test-user', rsp_account_id: 'signed-account' },
      cookies: { rsp_access: { idToken: 'old-token', account: 'untrusted-account' } },
    };
    response = {
      redirect: sinon.spy(), render: sinon.spy(), cookie: sinon.spy(), clearCookie: sinon.spy(),
    };
    next = sinon.spy();
  });

  afterEach(() => sinon.restore());

  it('clears the session and redirects logout to the registered callback', () => {
    sinon.stub(config, 'tenantId').returns('test-tenant');
    sinon.stub(config, 'redirectUri').returns('http://localhost:3000/login');

    main.logout(request, response);

    expect(request.session).to.equal(null);
    sinon.assert.calledWith(response.clearCookie, 'rsp_access');
    const url = new URL(response.redirect.firstCall.args[0]);
    expect(url.origin).to.equal('https://login.microsoftonline.com');
    expect(url.pathname).to.equal('/test-tenant/oauth2/v2.0/logout');
    expect(url.searchParams.get('post_logout_redirect_uri')).to.equal('http://localhost:3000/login');
  });

  it('uses verified claims for authorization', async () => {
    verify.resolves({ sub: 'test-user', roles: ['BankingFinance'] });
    await authorization(request, response, next);
    sinon.assert.calledOnceWithExactly(verify, 'old-token');
    sinon.assert.calledOnce(next);
    expect(request.session.rsp_user_role).to.deep.equal(['BankingFinance']);
  });

  it('refreshes once using the signed account and authorizes refreshed claims', async () => {
    verify.onFirstCall().rejects(new AuthorizationError('expired', AuthorizationErrorCode.EXPIRED_TOKEN));
    verify.onSecondCall().resolves({ sub: 'test-user', roles: ['BankingFinance'] });
    refresh.resolves({ idToken: 'new-token' });

    await authorization(request, response, next);

    sinon.assert.calledOnceWithExactly(refresh, 'signed-account');
    sinon.assert.calledTwice(verify);
    sinon.assert.calledWith(verify.secondCall, 'new-token');
    sinon.assert.calledOnce(next);
    sinon.assert.calledWith(response.cookie, 'rsp_access', { idToken: 'new-token' });
  });

  it('rejects a refreshed token belonging to another user', async () => {
    verify.onFirstCall().rejects(new AuthorizationError('expired', AuthorizationErrorCode.EXPIRED_TOKEN));
    verify.onSecondCall().resolves({ sub: 'other-user', roles: ['BankingFinance'] });
    refresh.resolves({ idToken: 'new-token' });

    await authorization(request, response, next);

    sinon.assert.notCalled(response.cookie);
    sinon.assert.notCalled(next);
    sinon.assert.calledWith(response.redirect, '/login');
  });

  it('does not accept an invalid refreshed token', async () => {
    verify.onFirstCall().rejects(new AuthorizationError('expired', AuthorizationErrorCode.EXPIRED_TOKEN));
    verify.onSecondCall().rejects(new AuthorizationError('invalid', AuthorizationErrorCode.VERIFY_TOKEN_ERROR));
    refresh.resolves({ idToken: 'invalid-token' });

    await authorization(request, response, next);

    sinon.assert.notCalled(response.cookie);
    sinon.assert.notCalled(next);
    sinon.assert.calledWith(response.redirect, '/login');
  });

  it('redirects when refresh fails without retrying', async () => {
    verify.rejects(new AuthorizationError('expired', AuthorizationErrorCode.EXPIRED_TOKEN));
    refresh.rejects(new Error('refresh failed'));
    await authorization(request, response, next);
    sinon.assert.calledOnce(verify);
    sinon.assert.calledWith(response.redirect, '/login');
  });

  it('does not create a session or cookie for an invalid login token', async () => {
    sinon.stub(authService, 'requestAccessToken').resolves({ idToken: 'bad-token' });
    verify.rejects(new AuthorizationError('invalid', AuthorizationErrorCode.VERIFY_TOKEN_ERROR));
    const loginRequest = { query: { code: 'test-code' }, session: {} };

    await main.login(loginRequest, response, next);

    sinon.assert.calledOnce(next);
    sinon.assert.notCalled(response.cookie);
    expect(loginRequest.session).to.deep.equal({});
  });

  it('binds a verified login to the signed session', async () => {
    sinon.stub(authService, 'requestAccessToken').resolves({
      idToken: 'new-token', account: { homeAccountId: 'test-account' },
    });
    verify.resolves({ sub: 'test-user' });
    const loginRequest = { query: { code: 'test-code' }, session: {} };

    await main.login(loginRequest, response, next);

    expect(loginRequest.session).to.deep.equal({
      rsp_subject: 'test-user', rsp_account_id: 'test-account',
    });
    sinon.assert.calledWith(response.cookie, 'rsp_access', { idToken: 'new-token' });
    sinon.assert.calledWith(response.redirect, '/');
  });
});
