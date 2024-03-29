import axios from 'axios';
import axiosRetry from 'axios-retry';
import aws4 from 'aws4';
import { isNumber } from 'lodash';
import URL from 'url-parse';
import { isObject } from 'util';
import { logAxiosError } from './logger';

import config from '../config';

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
    const fullPath = new URL(path, this.baseUrlOb.href);
    return axios.get(fullPath.toString(), options).catch((err) => {
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

    const url = new URL(path, this.baseUrlOb.href);

    return axios.post(url.toString(), data, options).catch((err) => {
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
    const url = new URL(path, this.baseUrlOb.href);
    return axios.delete(url.href, request).catch((err) => {
      logAxiosError(logName, this.serviceName, err, body);
      throw err;
    });
  }
}
