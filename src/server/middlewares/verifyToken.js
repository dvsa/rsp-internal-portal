import { decode, verify } from 'jsonwebtoken';
import JwksClient from 'jwks-rsa';
import config from '../config';
import { AuthorizationError, AuthorizationErrorCode } from '../utils/authorisationError';

export const verifyToken = async (rawToken) => {
  const region = config.region();
  const cognitoUserPoolId = config.cognitoUserPoolId();

  const decodedToken = decode(rawToken, { complete: true });
  if (!decodedToken) {
    throw new Error('Token failed to decode.');
  }
  try {
    const jwksClient = JwksClient({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`,
    });

    const key = await jwksClient.getSigningKey(decodedToken.header.kid);
    const publicKey = key.getPublicKey();
    verify(rawToken, publicKey);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthorizationError(`Token failed to verify. ${err.message}`, AuthorizationErrorCode.EXPIRED_TOKEN);
    }
    throw new AuthorizationError(`Token failed to verify. ${err.message}`, AuthorizationErrorCode.VERIFY_TOKEN_ERROR);
  }
  return true;
};

export const userToken = (idToken) => {
  const userInfo = decode(idToken, { complete: true });
  return userInfo.payload;
};
