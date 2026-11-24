import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import AuthService from '../../src/server/services/auth.service';
import config from '../../src/server/config';

chai.use(chaiAsPromised);

describe('authentication service', () => {
  let service;
  let post;

  beforeEach(() => {
    sinon.stub(config, 'clientId').returns('synthetic-client');
    sinon.stub(config, 'clientSecret').returns('synthetic-secret');
    sinon.stub(config, 'redirectUri').returns('https://portal.example.test/login');
    service = new AuthService('https://identity.example.test/');
    post = sinon.stub(service.httpClient, 'post');
  });
  afterEach(() => sinon.restore());

  it('exchanges an authorisation code using the expected form fields', async () => {
    post.resolves({ data: { access_token: 'synthetic-token' } });
    expect(await service.requestAccessToken('synthetic-code')).to.deep.equal({ access_token: 'synthetic-token' });
    expect(post.firstCall.args[0]).to.equal('/oauth2/token');
    expect(Object.fromEntries(new URLSearchParams(post.firstCall.args[1]))).to.deep.equal({
      grant_type: 'authorization_code',
      client_id: 'synthetic-client',
      client_secret: 'synthetic-secret',
      redirect_uri: 'https://portal.example.test/login',
      code: 'synthetic-code',
    });
  });

  it('propagates a failed authorisation code exchange', async () => {
    post.rejects(new Error('synthetic token exchange failure'));

    await expect(service.requestAccessToken('synthetic-code'))
      .to.be.rejectedWith('synthetic token exchange failure');
  });

  it('requests a refreshed token and propagates errors', async () => {
    post.onFirstCall().resolves({ data: { access_token: 'synthetic-token' } });
    post.onSecondCall().rejects(new Error('synthetic failure'));
    expect(await service.refreshAccessToken('synthetic-refresh')).to.deep.equal({ access_token: 'synthetic-token' });
    expect(Object.fromEntries(new URLSearchParams(post.firstCall.args[1]))).to.deep.equal({
      grant_type: 'refresh_token',
      client_id: 'synthetic-client',
      client_secret: 'synthetic-secret',
      refresh_token: 'synthetic-refresh',
    });
    await expect(service.refreshAccessToken('synthetic-refresh')).to.be.rejectedWith('synthetic failure');
  });
});
