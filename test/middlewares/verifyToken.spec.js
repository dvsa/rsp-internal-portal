import createJWKSMock from 'mock-jwks';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import config from '../../src/server/config';
import { userToken, verifyToken } from '../../src/server/middlewares/verifyToken';
import { AuthorizationError, AuthorizationErrorCode } from '../../src/server/utils/authorisationError';

chai.use(chaiAsPromised);

describe('VerifyToken', () => {
  const region = 'region';
  const cognitoUserPoolId = 'userPoolId';
  const cognitoUrl = `https://cognito-idp.${region}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`;
  const jwksMock = createJWKSMock(
    `https://cognito-idp.${region}.amazonaws.com`,
    `/${cognitoUserPoolId}/.well-known/jwks.json`,
  );

  beforeEach(async () => {
    sinon.stub(config, 'region').returns(region);
    sinon.stub(config, 'cognitoUserPoolId').returns(cognitoUserPoolId);
    jwksMock.start();
  });

  afterEach(async () => {
    config.region.restore();
    config.cognitoUserPoolId.restore();
    await jwksMock.stop();
  });

  context('Verify the Access token', () => {
    it('should succeed', async () => {
      const accessToken = jwksMock.token({
        aud: 'private',
        iss: cognitoUrl,
        client_id: 'client_id123',
        token_use: 'access',
      });

      const result = await verifyToken(accessToken);
      expect(result).to.be.true;
    });

    it('should throw if expired token', async () => {
      const accessToken = jwksMock.token({
        aud: 'private',
        iss: cognitoUrl,
        client_id: 'client_id123',
        token_use: 'access',
        exp: 60,
      });

      await expect(
        verifyToken(accessToken),
      ).to.eventually.be
        .rejectedWith('Token failed to verify. jwt expired')
        .and.be.an.instanceOf(AuthorizationError)
        .and.have.property('code', AuthorizationErrorCode.EXPIRED_TOKEN);
    });

    it('rejects a token that cannot be decoded', async () => {
      await expect(verifyToken('not-a-jwt'))
        .to.be.rejectedWith('Token failed to decode.');
    });

    it('rejects a token with a tampered payload', async () => {
      const token = jwksMock.token({ sub: 'synthetic-user' });
      const [header, , signature] = token.split('.');
      const payload = Buffer.from(JSON.stringify({ sub: 'other-user' })).toString('base64url');

      await expect(verifyToken(`${header}.${payload}.${signature}`))
        .to.eventually.be.rejectedWith('Token failed to verify. invalid signature')
        .and.be.an.instanceOf(AuthorizationError)
        .and.have.property('code', AuthorizationErrorCode.VERIFY_TOKEN_ERROR);
    });
  });

  context('Verify the ID token', () => {
    it('should succeed', async () => {
      const accessToken = jwksMock.token({
        aud: 'private',
        iss: cognitoUrl,
        client_id: 'client_id123',
        token_use: 'access',
        'custom:Role': '[Admin, BankingFinance]',
        name: 'User Name',
        email: 'name@email.com',
      });

      const result = await userToken(accessToken);
      expect(result).to.be.contain({
        client_id: 'client_id123',
        'custom:Role': '[Admin, BankingFinance]',
        name: 'User Name',
        email: 'name@email.com',
      });
    });
  });
});
