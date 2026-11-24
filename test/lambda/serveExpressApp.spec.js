import { expect } from 'chai';
import sinon from 'sinon';
import awsServerlessExpress from 'aws-serverless-express';
import * as appFactory from '../../src/server/app';
import config from '../../src/server/config';
import { handler } from '../../src/handler';

describe('Lambda Express adapter', () => {
  afterEach(() => sinon.restore());

  it('creates one server, strips the production prefix and proxies REST events', async () => {
    const app = {};
    const server = {};
    const response = { statusCode: 200, body: 'synthetic' };
    const factory = sinon.stub(appFactory, 'default').resolves(app);
    const createServer = sinon.stub(awsServerlessExpress, 'createServer').returns(server);
    const proxy = sinon.stub(awsServerlessExpress, 'proxy').returns({ promise: Promise.resolve(response) });
    const environment = sinon.stub(config, 'env').returns('production');
    const context = {};
    const first = { path: '/stage/robots.txt', httpMethod: 'GET' };
    const second = { path: '/stage/login', httpMethod: 'GET' };

    expect(await handler(first, context)).to.equal(response);
    expect(first.path).to.equal('/robots.txt');
    sinon.assert.calledOnce(factory);
    sinon.assert.calledWith(createServer, app, null, sinon.match.array);
    expect(createServer.firstCall.args[2]).to.include('text/html');
    sinon.assert.calledWithExactly(proxy, server, first, context, 'PROMISE');

    environment.returns('development');
    expect(await handler(second, context)).to.equal(response);
    expect(second.path).to.equal('/stage/login');
    sinon.assert.calledOnce(createServer);
    sinon.assert.calledTwice(proxy);
  });
});
