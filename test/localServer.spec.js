import sinon from 'sinon';
import express from 'express';
import * as appFactory from '../src/server/app';
import config from '../src/server/config';

describe('local server startup', () => {
  afterEach(() => sinon.restore());

  it('mounts the configured assets and listens on the configured port', async () => {
    const middleware = () => {};
    const app = {
      use: sinon.spy(),
      listen: sinon.stub().callsFake((port, callback) => callback()),
    };
    const createApp = sinon.stub(appFactory, 'default').resolves(app);
    const staticMiddleware = sinon.stub(express, 'static').returns(middleware);
    sinon.stub(config, 'port').returns(4321);
    sinon.stub(config, 'publicAssets').returns('/synthetic/assets');
    sinon.stub(config, 'views').returns('/synthetic/views');
    sinon.stub(console, 'log');

    // Load only after stubbing startup dependencies so no server is opened.
    require('../src/server/app.local'); // eslint-disable-line global-require
    await new Promise((resolve) => { setImmediate(resolve); });

    sinon.assert.calledWithExactly(createApp, { local: true });
    sinon.assert.calledWithExactly(staticMiddleware, '/synthetic/assets');
    sinon.assert.calledWithExactly(app.use, middleware);
    sinon.assert.calledWith(app.listen, 4321, sinon.match.func);
    sinon.assert.calledThrice(console.log);
  });
});
