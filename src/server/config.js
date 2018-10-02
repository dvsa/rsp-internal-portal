import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const configMetadata = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  cognitoUrl: 'COGNITO_URL',
  cognitoUserPoolId: 'COGNITO_USERPOOL_ID',
  cpmsServiceUrl: 'CPMS_SERVICE_URL',
  iamClientId: 'IAM_CLIENT_ID',
  iamClientSecret: 'IAM_CLIENT_SECRET',
  identityProvider: 'IDENTITY_PROVIDER',
  nodeEnv: 'NODE_ENV',
  paymentServiceUrl: 'PAYMENT_SERVICE_URL',
  penaltyServiceUrl: 'PENALTY_SERVICE_URL',
  port: 'PORT',
  postPaymentRedirectBaseUrl: 'POST_PAYMENT_REDIRECT_BASE_URL',
  publicAssets: 'PUBLIC_ASSETS',
  redirectUri: 'REDIRECT_URI',
  region: 'REGION',
  urlRoot: 'URL_ROOT',
  views: 'VIEWS',
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

function clientId() {
  return configuration[configMetadata.clientId] || 'client';
}

function clientSecret() {
  return configuration[configMetadata.clientSecret] || 'secret';
}

function cognitoUserPoolId() {
  return configuration[configMetadata.cognitoUserPoolId];
}

function cognitoUrl() {
  return configuration[configMetadata.cognitoUrl];
}

function cpmsServiceUrl() {
  return configuration[configMetadata.cpmsServiceUrl];
}

function env() {
  return configuration[configMetadata.nodeEnv] || 'development';
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

function isDevelopment() {
  return env() === 'development';
}

function paymentServiceUrl() {
  return configuration[configMetadata.paymentServiceUrl];
}

function penaltyServiceUrl() {
  return configuration[configMetadata.penaltyServiceUrl];
}

function port() {
  const portVar = configuration[configMetadata.port];
  return portVar ? Number(portVar) : 3000;
}

function postPaymentRedirectBaseUrl() {
  return configuration[configMetadata.postPaymentRedirectBaseUrl];
}

function publicAssets() {
  return configuration[configMetadata.publicAssets] || path.resolve(__dirname, '..', 'public');
}

function redirectUri() {
  return configuration[configMetadata.redirectUri];
}

function region() {
  return configuration[configMetadata.region];
}

function urlRoot() {
  return ensureRelativeUrl(configuration[configMetadata.urlRoot]);
}

function views() {
  return configuration[configMetadata.views] || path.resolve(__dirname, 'views');
}

const config = {
  bootstrap,
  clientId,
  clientSecret,
  cognitoUrl,
  cognitoUserPoolId,
  cpmsServiceUrl,
  env,
  iamClientId,
  iamClientSecret,
  identityProvider,
  isDevelopment,
  paymentServiceUrl,
  penaltyServiceUrl,
  port,
  postPaymentRedirectBaseUrl,
  publicAssets,
  redirectUri,
  region,
  urlRoot,
  views,
};

export default config;
