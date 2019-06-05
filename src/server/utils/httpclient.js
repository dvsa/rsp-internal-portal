import axios from 'axios';
import axiosRetry from 'axios-retry';
import aws4 from 'aws4';
import { isNumber } from 'lodash';
import URL from 'url-parse';
import { isObject } from 'util';

import config from '../config';
import { logAxiosError } from './logger';

export const createUnsignedHttpClient = (baseURL, headers = { Authorization: 'allow' }) => axios.create({
  baseURL,
  headers,
});

export default class SignedHttpClient {
  constructor(baseURL, headers, serviceName) {
    this.baseUrlOb = new URL(baseURL);
    this.headers = headers;
    this.serviceName = serviceName;
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

  get(path, logName) {
    const options = {
      path: `${this.baseUrlOb.pathname}${path}`,
      ...(config.doSignedRequests() ? this.signingOptions : {}),
    };
    if (config.doSignedRequests()) {
      aws4.sign(options, {
        accessKeyId: this.credentials.clientId,
        secretAccessKey: this.credentials.clientSecret,
      });
    }
    const fullPath = `${this.baseUrlOb.href}${path}`;
    return axios.get(fullPath, options).catch((err) => {
      logAxiosError(logName, this.serviceName, err);
      throw err;
    });
  }

  post(path, data, retryAttempts, logName) {
    const options = {
      body: JSON.stringify(data),
      path: `${this.baseUrlOb.pathname}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(config.doSignedRequests() ? this.signingOptions : {}),
    };
    if (config.doSignedRequests()) {
      aws4.sign(options, {
        accessKeyId: this.credentials.clientId,
        secretAccessKey: this.credentials.clientSecret,
      });
    }

    if (isNumber(retryAttempts) && retryAttempts !== 0) {
      options['axios-retry'] = {
        retries: retryAttempts,
        retryCondition: axiosRetry.isRetryableError,
      };
    }

    return axios.post(`${this.baseUrlOb.href}${path}`, data, options).catch((err) => {
      logAxiosError(logName, this.serviceName, err, data);
      throw err;
    });
  }

  delete(path, body, logName) {
    const request = {
      method: 'DELETE',
      path: `${this.baseUrlOb.pathname}${path}`,
      ...(config.doSignedRequests() ? this.signingOptions : {}),
    };

    if (isObject(body)) {
      const jsonBody = JSON.stringify(body);
      // Both required in order for AWS request signing to work
      request.data = jsonBody;
      request.body = jsonBody;
    }

    if (config.doSignedRequests()) {
      aws4.sign(request, {
        accessKeyId: this.credentials.clientId,
        secretAccessKey: this.credentials.clientSecret,
      });
    }
    return axios.delete(`${this.baseUrlOb.href}${path}`, request).catch((err) => {
      logAxiosError(logName, this.serviceName, err, body);
      throw err;
    });
  }
}
