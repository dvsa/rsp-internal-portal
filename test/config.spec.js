import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import config from '../src/server/config';

chai.use(chaiAsPromised);

describe('Config', () => {
  const savedEnv = {};
  const envKeys = ['USE_SECRETS_MANAGER', 'SECRETS_MANAGER_SECRET_NAME', 'REGION', 'CLIENT_ID'];

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
    it('loads environment configuration without calling Secrets Manager', async () => {
      process.env.USE_SECRETS_MANAGER = 'false';
      process.env.CLIENT_ID = 'synthetic-client';
      const send = sinon.stub(SecretsManagerClient.prototype, 'send');

      await config.bootstrap();

      expect(config.clientId()).to.equal('synthetic-client');
      sinon.assert.notCalled(send);
    });

    it('loads a secret using the configured region and secret name', async () => {
      process.env.USE_SECRETS_MANAGER = 'true';
      process.env.SECRETS_MANAGER_SECRET_NAME = 'synthetic-secret';
      process.env.REGION = 'eu-west-1';
      const send = sinon.stub(SecretsManagerClient.prototype, 'send')
        .resolves({ SecretString: JSON.stringify({ CLIENT_ID: 'synthetic-secret-client' }) });

      await config.bootstrap();

      expect(config.clientId()).to.equal('synthetic-secret-client');
      sinon.assert.calledOnce(send);
      expect(send.firstCall.args[0]).to.be.instanceOf(GetSecretValueCommand);
      expect(send.firstCall.args[0].input).to.deep.equal({ SecretId: 'synthetic-secret' });
      expect(await send.firstCall.thisValue.config.region()).to.equal('eu-west-1');
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
