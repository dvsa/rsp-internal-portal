import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import HttpClient from '../../src/server/utils/httpclient';
import config from '../../src/server/config';

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
      let statusCode;
      try {
        statusCode = (await httpClient.post('test', {})).status;
      } catch (err) {
        statusCode = err.response.status;
      }
      expect(statusCode).to.equal(502);
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
      const resp = await httpClient.post('test', {}, 1);
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
      const resp = await httpClient.post('test', {}, 2);
      expect(resp.status).to.equal(200);
    });
  });

  context('given extra // in path', () => {
    beforeEach(() => {
      nock('http://localhost')
        .post('/test', {})
        .reply(200, 'OK');
    });
    it('should still resolve correctly', async () => {
      let statusCode;
      try {
        statusCode = (await httpClient.post('/test', {})).status;
      } catch (err) {
        statusCode = err.response.status;
      }
      expect(statusCode).to.equal(200);
    });
  });

  context('given a get request without needing a signed request', () => {
    beforeEach(() => {
      sinon.stub(config, 'doSignedRequests').returns(false);
      nock('http://localhost')
        .get('/test')
        .reply(200, 'OK');
    });
    it('should return response successfully ', async () => {
      let statusCode;
      try {
        statusCode = (await httpClient.get('test', 'logGroup')).status;
      } catch (err) {
        statusCode = err.response.status;
      }
      expect(statusCode).to.equal(200);
    });
  });
});
