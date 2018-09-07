import { expect, fail } from 'chai';
import nock from 'nock';
import HttpClient from '../../src/server/utils/httpclient';

describe('httpclient', () => {
  let httpClient;

  beforeEach(() => {
    httpClient = new HttpClient('http://localhost');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  context('given a server responds to a POST with 502 followed by 200 without retry being set', () => {
    beforeEach(() => {
      nock('http://localhost')
        .post('/test', {})
        .reply(502, JSON.stringify({ message: 'Internal Server Error' }))
        .post('/test', {})
        .reply(200, 'OK');
    });
    it('should reject due to the 502', async () => {
      try {
        await httpClient.post('/test', {});
      } catch (err) {
        expect(err.response.status).to.equal(502);
        return;
      }
      fail();
    });
  });

  context('given server responds to a POST with 502, followed by 200 with a single retry', () => {
    beforeEach(() => {
      nock('http://localhost')
        .post('/test', {})
        .reply(502, JSON.stringify({ message: 'Internal Server Error' }))
        .post('/test', {})
        .reply(200, 'OK');
    });
    it('should retry in order to get the 200 response', async () => {
      const resp = await httpClient.post('/test', {}, 1);
      expect(resp.status).to.equal(200);
    });
  });

  context('given server responds to a POST twice with 502, followed by 200 with a two retries', () => {
    beforeEach(() => {
      nock('http://localhost')
        .post('/test', {})
        .reply(502, JSON.stringify({ message: 'Internal Server Error' }))
        .post('/test', {})
        .reply(502, JSON.stringify({ message: 'Internal Server Error' }))
        .post('/test', {})
        .reply(200, 'OK');
    });
    it('should retry in order to get the 200 response', async () => {
      const resp = await httpClient.post('/test', {}, 2);
      expect(resp.status).to.equal(200);
    });
  });
});
