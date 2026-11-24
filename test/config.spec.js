import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import createApp from '../src/server/app';
import config from '../src/server/config';

chai.use(chaiAsPromised);

describe('Config', () => {
  const savedEnv = {};
  const envKeys = ['USE_SECRETS_MANAGER', 'SECRETS_MANAGER_SECRET_NAME', 'REGION', 'CLIENT_ID', 'URL_ROOT', 'NODE_ENV', 'REDIRECT_URI'];

  beforeEach(() => {
    envKeys.forEach((key) => { savedEnv[key] = process.env[key]; });
  });

  afterEach(() => {
    sinon.restore();
    envKeys.forEach((key) => {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    });
  });

  context('configuration bootstrap', () => {
    it('preserves local environment configuration without calling Secrets Manager', async () => {
      process.env.USE_SECRETS_MANAGER = 'false';
      process.env.CLIENT_ID = 'synthetic-client';
      process.env.URL_ROOT = '/local-prefix';
      process.env.NODE_ENV = 'production';
      const send = sinon.stub(SecretsManagerClient.prototype, 'send');

      await config.bootstrap({ local: true });

      expect(config.clientId()).to.equal('synthetic-client');
      expect(config.urlRoot()).to.equal('/local-prefix');
      expect(config.env()).to.equal('production');
      sinon.assert.notCalled(send);
    });

    it('loads a secret using the configured region and secret name', async () => {
      process.env.USE_SECRETS_MANAGER = 'true';
      process.env.SECRETS_MANAGER_SECRET_NAME = 'synthetic-secret';
      process.env.REGION = 'eu-west-1';
      process.env.URL_ROOT = '/local-prefix';
      process.env.REDIRECT_URI = 'http://localhost:3000/login';
      const send = sinon.stub(SecretsManagerClient.prototype, 'send')
        .resolves({
          SecretString: JSON.stringify({
            CLIENT_ID: 'synthetic-secret-client',
            URL_ROOT: '/internal-portal',
            NODE_ENV: 'production',
            REDIRECT_URI: 'https://portal.example.invalid/internal-portal/login',
          }),
        });

      await config.bootstrap();

      expect(config.clientId()).to.equal('synthetic-secret-client');
      expect(config.urlRoot()).to.equal('/internal-portal');
      expect(config.env()).to.equal('production');
      expect(config.redirectUri()).to.equal('https://portal.example.invalid/internal-portal/login');
      sinon.assert.calledOnce(send);
      expect(send.firstCall.args[0]).to.be.instanceOf(GetSecretValueCommand);
      expect(send.firstCall.args[0].input).to.deep.equal({ SecretId: 'synthetic-secret' });
      expect(await send.firstCall.thisValue.config.region()).to.equal('eu-west-1');
    });

    it('uses local URL settings while retaining other secret configuration', async () => {
      process.env.USE_SECRETS_MANAGER = 'true';
      process.env.URL_ROOT = '';
      process.env.REDIRECT_URI = 'http://localhost:3000/login';
      sinon.stub(SecretsManagerClient.prototype, 'send').resolves({
        SecretString: JSON.stringify({
          CLIENT_ID: 'synthetic-secret-client',
          URL_ROOT: '/internal-portal',
          NODE_ENV: 'production',
          REDIRECT_URI: 'https://portal.example.invalid/internal-portal/login',
        }),
      });

      const app = await createApp({ local: true });
      const html = await new Promise((resolve, reject) => {
        app.render('main/index', {}, (error, rendered) => {
          if (error) reject(error);
          else resolve(rendered);
        });
      });

      expect(config.urlRoot()).to.equal('');
      expect(config.env()).to.equal('production');
      expect(config.redirectUri()).to.equal('http://localhost:3000/login');
      expect(config.clientId()).to.equal('synthetic-secret-client');
      expect(html).to.include('<form action="/" method="POST">');
    });

    it('propagates SDK failures', async () => {
      process.env.USE_SECRETS_MANAGER = 'true';
      const error = new Error('synthetic SDK failure');
      sinon.stub(SecretsManagerClient.prototype, 'send').rejects(error);

      await expect(config.bootstrap()).to.be.rejectedWith('synthetic SDK failure');
    });

    [undefined, '{invalid'].forEach((value) => {
      it(`rejects ${value === undefined ? 'missing' : 'malformed'} secret JSON`, async () => {
        process.env.USE_SECRETS_MANAGER = 'true';
        sinon.stub(SecretsManagerClient.prototype, 'send').resolves({ SecretString: value });

        await expect(config.bootstrap()).to.be.rejectedWith('invalid or missing secret JSON');
      });
    });
  });

  context('payment limit days', () => {
    it('should use default value if no env variable exists', async () => {
      await config.bootstrap();
      const payment = config.paymentLimitDays();
      expect(payment).to.equal(42);
    });
  });
});
