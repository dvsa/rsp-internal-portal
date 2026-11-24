import sinon from 'sinon';
import * as main from '../../src/server/controllers/main.controller';
import AuthService from '../../src/server/services/auth.service';
import config from '../../src/server/config';

describe('main controller routes', () => {
  let res;

  beforeEach(() => {
    sinon.stub(config, 'urlRoot').returns('');
    sinon.stub(config, 'cognitoUrl').returns('https://identity.example.test');
    sinon.stub(config, 'clientId').returns('synthetic-client');
    sinon.stub(config, 'clientSecret').returns('synthetic-secret');
    sinon.stub(config, 'identityProvider').returns('synthetic-provider');
    sinon.stub(config, 'redirectUri').returns('https://portal.example.test/login');
    sinon.stub(config, 'isDevelopment').returns(false);
    res = {
      render: sinon.spy(), redirect: sinon.spy(), cookie: sinon.spy(), clearCookie: sinon.spy(),
    };
  });
  afterEach(() => sinon.restore());

  it('renders invalid search flags and session values', () => {
    main.index({ query: { invalidPaymentCode: '' }, session: { marker: 'synthetic' } }, res);
    sinon.assert.calledWith(res.render, 'main/index', sinon.match({
      invalidPaymentCode: true, invalid: true, input: 'payment code', marker: 'synthetic',
    }));
    main.index({ query: { invalidFPN: '' }, session: {} }, res);
    sinon.assert.calledWith(res.render, 'main/index', sinon.match({ invalidFPN: true, input: 'fine reference' }));
  });

  it('normalises payment code searches and handles missing input', async () => {
    await main.searchPenalty({ body: { 'search-by': 'code', payment_code: 'AB_CD-12' } }, res);
    await main.searchPenalty({ body: { 'search-by': 'code' } }, res);
    sinon.assert.calledWith(res.redirect, '/payment-code/abcd12');
    sinon.assert.calledWith(res.redirect, '/payment-code/null');
  });

  it('formats fine and immobilisation reference searches', async () => {
    await main.searchPenalty({ body: { 'search-by': 'FPN', penalty_ref_FPN: '123' } }, res);
    await main.searchPenalty({ body: { 'search-by': 'IM', penalty_ref_IM: '12-0-34' } }, res);
    await main.searchPenalty({ body: { 'search-by': 'IM' } }, res);
    sinon.assert.calledWith(res.redirect, 'penalty/123_FPN');
    sinon.assert.calledWith(res.redirect, 'penalty/0000120000034_IM');
    sinon.assert.calledWith(res.redirect, 'penalty/_IM');
  });

  it('redirects vehicle searches and strips non-alphanumeric characters', async () => {
    await main.searchPenalty({ body: { 'search-by': 'vehicle-reg', vehicle_reg: ' ' } }, res);
    await main.searchPenalty({ body: { 'search-by': 'vehicle-reg', vehicle_reg: 'ab 12' } }, res);
    sinon.assert.calledWith(res.redirect, '/?invalidReg');
    sinon.assert.calledWith(res.redirect, '/vehicle-reg-search-results/ab 12');
    const req = { params: { vehicle_reg: 'ab 12-cde' } };
    const next = sinon.spy();
    main.normaliseRegistration(req, res, next);
    sinon.assert.match(req.params.vehicle_reg, 'AB12CDE');
    sinon.assert.calledOnce(next);
  });

  it('redirects to identity authorisation without a callback code', () => {
    main.login({ query: {} }, res);
    const url = new URL(res.redirect.firstCall.args[0]);
    sinon.assert.match(url.pathname, '/oauth2/authorize');
    sinon.assert.match(url.searchParams.get('identity_provider'), 'synthetic-provider');
    sinon.assert.match(url.searchParams.get('redirect_uri'), 'https://portal.example.test/login');
  });

  it('sets authentication cookies when the callback succeeds', async () => {
    sinon.stub(AuthService.prototype, 'requestAccessToken').resolves({
      access_token: 'synthetic-access', id_token: 'synthetic-id', refresh_token: 'synthetic-refresh', expires_in: 300,
    });
    main.login({ query: { code: 'synthetic-code' } }, res);
    await new Promise((resolve) => { setImmediate(resolve); });
    sinon.assert.calledWith(res.cookie, 'rsp_access', sinon.match.object, sinon.match({ httpOnly: true, secure: true }));
    sinon.assert.calledWith(res.cookie, 'rsp_refresh', sinon.match.object, sinon.match({ httpOnly: true, secure: true }));
    sinon.assert.calledWith(res.redirect, '/');
  });

  it('restarts authorisation when the callback fails', async () => {
    sinon.stub(AuthService.prototype, 'requestAccessToken').rejects(new Error('synthetic failure'));
    main.login({ query: { code: 'synthetic-code' } }, res);
    await new Promise((resolve) => { setImmediate(resolve); });
    sinon.assert.match(res.redirect.firstCall.args[0], /^https:\/\/identity\.example\.test\/oauth2\/authorize/);
  });

  it('clears session and cookies on logout', () => {
    const req = { session: {} };
    main.logout(req, res);
    sinon.assert.match(req.session, null);
    sinon.assert.calledWith(res.clearCookie, 'rsp_access');
    sinon.assert.calledWith(res.clearCookie, 'rsp_refresh');
    sinon.assert.match(res.redirect.firstCall.args[0], /^https:\/\/identity\.example\.test\/logout\?/);
  });
});
