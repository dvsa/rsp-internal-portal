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

function penaltyServiceUrl() {
  return configuration[configMetadata.penaltyServiceUrl];
}

const env = process.env.NODE_ENV || 'development';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const isDevelopment = env === 'development';
const urlRoot = ensureRelativeUrl(process.env.URL_ROOT);
const assets = process.env.PUBLIC_ASSETS || path.resolve(__dirname, '..', 'public');
const views = process.env.VIEWS || path.resolve(__dirname, 'views');
const clientId = process.env.CLIENT_ID || 'client';
const clientSecret = process.env.CLIENT_SECRET || 'secret';
const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL;
const identityProvider = process.env.IDENTITY_PROVIDER;
const redirectUri = process.env.REDIRECT_URI;
const region = process.env.REGION;
const userPoolId = process.env.COGNITO_USERPOOL_ID;
const cognitoUrl = process.env.COGNITO_URL;
const cpmsServiceUrl = process.env.CPMS_SERVICE_URL;
const iamClientId = process.env.IAM_CLIENT_ID;
const iamClientSecret = process.env.IAM_CLIENT_SECRET;
const postPaymentRedirectBaseUrl = process.env.POST_PAYMENT_REDIRECT_BASE_URL;

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
