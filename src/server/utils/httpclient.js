import axios from 'axios';
import axiosRetry from 'axios-retry';
import aws4 from 'aws4';
import { isNumber } from 'lodash';
import URL from 'url-parse';
import { isObject } from 'util';

import config from '../config';

export const createUnsignedHttpClient = (baseURL, headers = { Authorization: 'allow' }) => axios.create({
  baseURL,
  headers,
});

export default class SignedHttpClient {
  constructor(baseURL, headers) {
    this.baseUrlOb = new URL(baseURL);
    this.headers = headers;
    this.credentials = {
      clientId: config.iamClientId(),
      clientSecret: config.iamClientSecret(),
    };
    this.signingOptions = {
      host: this.baseUrlOb.host,
      region: config.region(),
    };
    axiosRetry(axios);
  }

  get(path) {
    const options = {
      path: `${this.baseUrlOb.pathname}${path}`,
      ...this.signingOptions,
    };
    aws4.sign(options, {
      accessKeyId: this.credentials.clientId,
      secretAccessKey: this.credentials.clientSecret,
    });
    const fullPath = `${this.baseUrlOb.href}${path}`;
    return axios.get(fullPath, options);
  }

  post(path, data, retryAttempts) {
    const options = {
      body: JSON.stringify(data),
      path: `${this.baseUrlOb.pathname}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
      ...this.signingOptions,
    };
    aws4.sign(options, {
      accessKeyId: this.credentials.clientId,
      secretAccessKey: this.credentials.clientSecret,
    });

    if (isNumber(retryAttempts)) {
      options['axios-retry'] = {
        retries: retryAttempts,
        retryCondition: axiosRetry.isRetryableError,
      };
    }

    return axios.post(`${this.baseUrlOb.href}${path}`, data, options);
  }

  delete(path, body) {
    const request = {
      method: 'DELETE',
      path: `${this.baseUrlOb.pathname}${path}`,
      ...this.signingOptions,
    };

    if (isObject(body)) {
      const jsonBody = JSON.stringify(body);
      // Both required in order for AWS request signing to work
      request.data = jsonBody;
      request.body = jsonBody;
    }

    aws4.sign(request, {
      accessKeyId: this.credentials.clientId,
      secretAccessKey: this.credentials.clientSecret,
    });
    return axios.delete(`${this.baseUrlOb.href}${path}`, request);
  }
}
