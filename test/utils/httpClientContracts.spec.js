import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import sinon from 'sinon';
import SignedHttpClient from '../../src/server/utils/httpclient';
import config from '../../src/server/config';
import { errorMessageFromAxiosError } from '../../src/server/utils/logger';

chai.use(chaiAsPromised);

describe('signed HTTP client contracts', () => {
  let client;

  beforeEach(() => {
    sinon.stub(config, 'doSignedRequests').returns(true);
    sinon.stub(config, 'iamClientId').returns('synthetic-id');
    sinon.stub(config, 'iamClientSecret').returns('synthetic-secret');
    sinon.stub(config, 'region').returns('eu-west-1');
    client = new SignedHttpClient('https://service.example.test/', {}, 'synthetic');
  });

  afterEach(() => {
    sinon.restore();
    nock.cleanAll();
  });

  it('signs GET and POST requests and preserves JSON bodies', async () => {
    const scope = nock('https://service.example.test')
      .matchHeader('authorization', /^AWS4-HMAC-SHA256 /)
      .get('/resource').reply(200, { ok: true })
      .post('/resource', { value: 'synthetic' })
      .reply(200, { ok: true });
    expect((await client.get('resource', 'Get')).data).to.deep.equal({ ok: true });
    expect((await client.post('resource', { value: 'synthetic' }, 0, 'Post')).data).to.deep.equal({ ok: true });
    expect(scope.isDone()).to.equal(true);
  });

  it('signs DELETE requests with JSON bodies', async () => {
    const scope = nock('https://service.example.test')
      .matchHeader('authorization', /^AWS4-HMAC-SHA256 /)
      .delete('/resource', { value: 'synthetic' }).reply(200, {});
    await client.delete('resource', { value: 'synthetic' }, 'Delete');
    expect(scope.isDone()).to.equal(true);
  });

  it('propagates downstream GET and DELETE failures', async () => {
    nock('https://service.example.test')
      .get('/resource').reply(400, {})
      .delete('/resource')
      .reply(400, {});
    await expect(client.get('resource', 'Get')).to.be.rejected;
    await expect(client.delete('resource', undefined, 'Delete')).to.be.rejected;
  });

  it('summarises errors without a response', () => {
    expect(errorMessageFromAxiosError({ request: 'synthetic-request' })).to.deep.equal({
      message: 'The request was made but no response was received',
      request: 'synthetic-request',
    });
    expect(errorMessageFromAxiosError(new Error('synthetic failure'))).to.deep.equal({ errorMessage: 'synthetic failure' });
  });
});
