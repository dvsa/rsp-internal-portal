import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const configMetadata = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  cognitoUrl: 'COGNITO_URL',
  cognitoUserpoolId: 'COGNITO_USERPOOL_ID',
  cpmsServiceUrl: 'CPMS_SERVICE_URL',
  iamClientId: 'IAM_CLIENT_ID',
  iamClientSecret: 'IAM_CLIENT_SECRET',
  identityProvider: 'IDENTITY_PROVIDER',
  nodeEnv: 'NODE_ENV',
  paymentServiceUrl: 'PAYMENT_SERVICE_URL',
  penaltyServiceUrl: 'PENALTY_SERVICE_URL',
  postPaymentRedirectBaseUrl: 'POST_PAYMENT_REDIRECT_BASE_URL',
  publicAssets: 'PUBLIC_ASSETS',
  redirectUri: 'REDIRECT_URI',
  region: 'REGION',
  urlRoot: 'URL_ROOT',
};

let configuration = {};
async function bootstrap() {
  return new Promise((resolve, reject) => {
    if (process.env.USE_SECRETS_MANAGER === 'true') {
      const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
      console.log(`Pulling config from AWS Secrets Manager for secret ${SecretId}...`);
      const secretsManagerClient = new AWS.SecretsManager({ region: process.env.REGION });
      secretsManagerClient.getSecretValue({ SecretId }, (err, secretsManagerResponse) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        configuration = JSON.parse(secretsManagerResponse.SecretString);
        console.log(`Cached ${Object.keys(configuration).length} config items from secrets manager`);
        resolve(configuration);
      });
    } else {
      console.log('Using envvars for config');
      configuration = Object.values(configMetadata)
        .reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
      console.log('Finished getting envvars');
      resolve(configuration);
    }
  });
}

function ensureRelativeUrl(url) {
  if (!url) {
    return '';
  }

  if (!url.startsWith('/')) {
    return `/${url}`;
  }

  return url;
}

function cognitoUrl() {
  return configuration[configMetadata.cognitoUrl];
}

function cpmsServiceUrl() {
  return configuration[configMetadata.cpmsServiceUrl];
}

function iamClientId() {
  return configuration[configMetadata.iamClientId];
}

function iamClientSecret() {
  return configuration[configMetadata.iamClientSecret];
}

function identityProvider() {
  return configuration[configMetadata.identityProvider];
}

function paymentServiceUrl() {
  return configuration[configMetadata.paymentServiceUrl];
}

function penaltyServiceUrl() {
  return configuration[configMetadata.penaltyServiceUrl];
}

function postPaymentRedirectBaseUrl() {
  return configuration[configMetadata.postPaymentRedirectBaseUrl];
}

function redirectUri() {
  return configuration[configMetadata.redirectUri];
}

function region() {
  return configuration[configMetadata.region];
}

const env = process.env.NODE_ENV || 'development';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const isDevelopment = env === 'development';
const urlRoot = ensureRelativeUrl(process.env.URL_ROOT);
const assets = process.env.PUBLIC_ASSETS || path.resolve(__dirname, '..', 'public');
const views = process.env.VIEWS || path.resolve(__dirname, 'views');
const clientId = process.env.CLIENT_ID || 'client';
const clientSecret = process.env.CLIENT_SECRET || 'secret';
const userPoolId = process.env.COGNITO_USERPOOL_ID;

const config = {
  bootstrap,
  env,
  port,
  isDevelopment,
  assets,
  views,
  clientId,
  clientSecret,
  urlRoot,
  penaltyServiceUrl,
  paymentServiceUrl,
  cognitoUrl,
  identityProvider,
  redirectUri,
  region,
  userPoolId,
  cpmsServiceUrl,
  iamClientId,
  iamClientSecret,
  postPaymentRedirectBaseUrl,
};

export default config;
