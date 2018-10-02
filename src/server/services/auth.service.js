import { encode } from 'base-64';
import queryString from 'querystring';
import { createUnsignedHttpClient } from '../utils/httpclient';
import config from '../config';

export default class AuthService {
  constructor(serviceUrl) {
    const secret = encode(`${config.clientId}:${config.clientSecret}`);

    const defaults = {
      headers: {
        Authorisation: `Basic ${secret}`,
      },
    };

    this.httpClient = createUnsignedHttpClient(serviceUrl, defaults);
  }

  requestAccessToken(code) {
    const payload = {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri(),
      code,
    };

    const promise = new Promise((resolve) => {
      this.httpClient.post('/oauth2/token', queryString.stringify(payload)).then((result) => {
        resolve(result.data);
      });
    });
    return promise;
  }

  refreshAccessToken(refreshToken) {
    const payload = {
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    };

    const promise = new Promise((resolve, reject) => {
      this.httpClient.post('/oauth2/token', queryString.stringify(payload)).then((result) => {
        resolve(result.data);
      }).catch(error => reject(error));
    });

    return promise;
  }
}
