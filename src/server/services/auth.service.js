import { ConfidentialClientApplication } from '@azure/msal-node';
import { decode, verify } from 'jsonwebtoken';
import JwksClient from 'jwks-rsa';
import config from '../config';
import { AuthorizationError, AuthorizationErrorCode } from '../utils/authorisationError';

export default class AuthService {
  clientApp = null;

  constructor() {
    this.clientApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId(),
        clientSecret: config.clientSecret(),
        authority: `https://login.microsoftonline.com/${config.tenantId()}`,
      },
    });
  }

  login() {
    return this.clientApp.getAuthCodeUrl({
      scopes: ['openid', 'profile', 'email'],
      redirectUri: config.redirectUri(),
    });
  }

  logout = () => `https://login.microsoftonline.com/${config.tenantId()}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(config.redirectUri())}`;

  requestAccessToken(code) {
    return this.clientApp.acquireTokenByCode({
      code,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: config.redirectUri(),
    });
  }

  async refreshAccessToken(accountId) {
    if (!accountId) return null;
    const account = await this.clientApp.getTokenCache().getAccountByHomeId(accountId);
    if (!account) return null;
    return this.clientApp.acquireTokenSilent({
      account,
      scopes: ['openid', 'profile', 'email'],
    });
  }

  verifyToken = async (rawToken) => {
    try {
      const decodedToken = decode(rawToken, { complete: true });
      if (!decodedToken || !decodedToken.header.kid) {
        throw new Error('Token failed to decode.');
      }
      const jwksClient = JwksClient({
        jwksUri: `https://login.microsoftonline.com/${config.tenantId()}/discovery/v2.0/keys`,
      });

      const key = await jwksClient.getSigningKey(decodedToken.header.kid);
      const publicKey = key.getPublicKey();
      const claims = verify(rawToken, publicKey, {
        algorithms: ['RS256'],
        audience: config.clientId(),
        issuer: `https://login.microsoftonline.com/${config.tenantId()}/v2.0`,
      });
      if (!claims || typeof claims !== 'object' || !Number.isFinite(claims.exp)
        || typeof claims.sub !== 'string' || !claims.sub) {
        throw new Error('Token is missing required claims.');
      }
      return claims;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthorizationError(`Token failed to verify. ${err.message}`, AuthorizationErrorCode.EXPIRED_TOKEN);
      }
      throw new AuthorizationError(`Token failed to verify. ${err.message}`, AuthorizationErrorCode.VERIFY_TOKEN_ERROR);
    }
  };
}

export const authService = new AuthService();
