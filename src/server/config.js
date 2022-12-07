import { SecretsManager } from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { logError, logInfo } from './utils/logger';

dotenv.config();

const configMetadata = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  cognitoUrl: 'COGNITO_URL',
  cognitoUserPoolId: 'COGNITO_USERPOOL_ID',
  cpmsServiceUrl: 'CPMS_SERVICE_URL',
  doSignedRequests: 'DO_SIGNED_REQUESTS',
  doRoleChecks: 'DO_ROLE_CHECKS',
  iamClientId: 'IAM_CLIENT_ID',
  iamClientSecret: 'IAM_CLIENT_SECRET',
  identityProvider: 'IDENTITY_PROVIDER',
  nodeEnv: 'NODE_ENV',
  orphanedPaymentCheckingTime: 'ORPHANED_PAYMENT_CHECKING_TIME',
  paymentServiceUrl: 'PAYMENT_SERVICE_URL',
  penaltyServiceUrl: 'PENALTY_SERVICE_URL',
  port: 'PORT',
  postPaymentRedirectBaseUrl: 'POST_PAYMENT_REDIRECT_BASE_URL',
  publicAssets: 'PUBLIC_ASSETS',
  redirectUri: 'REDIRECT_URI',
  region: 'REGION',
  urlRoot: 'URL_ROOT',
  views: 'VIEWS',
  paymentLimitDays: 'PAYMENT_LIMIT_DAYS',
};

let configuration = {};
async function bootstrap() {
  return new Promise((resolve, reject) => {
    if (process.env.USE_SECRETS_MANAGER === 'true') {
      const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
      logInfo('InternalPortalSecretsManagerId', { secretId: SecretId });
      const secretsManagerClient = new SecretsManager({ region: process.env.REGION });
      secretsManagerClient.getSecretValue({ SecretId }, (err, secretsManagerResponse) => {
        if (err) {
          logError('InternalPortalSecretsManagerError', err.message);
          reject(err);
          return;
        }
        configuration = JSON.parse(secretsManagerResponse.SecretString);
        resolve(configuration);
      });
    } else {
      logInfo('InternalPortalEnvVars', 'Using envvars for config');
      configuration = Object.values(configMetadata)
        .reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
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

function doSignedRequests() {
  return configuration[configMetadata.doSignedRequests] === 'true';
}

function doRoleChecks() {
  const configVal = configuration[configMetadata.doRoleChecks];
  return configVal !== 'false';
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

function orphanedPaymentCheckingTime() {
  return Number(configuration[configMetadata.orphanedPaymentCheckingTime]);
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

function paymentLimitDays() {
  const defaultDays = 42;
  const days = configuration[configMetadata.paymentLimitDays];
  if (days) {
    return Number.isNaN(Number(days)) ? defaultDays : Number(days);
  }
  return defaultDays;
}

const config = {
  bootstrap,
  clientId,
  clientSecret,
  cognitoUrl,
  cognitoUserPoolId,
  cpmsServiceUrl,
  doSignedRequests,
  doRoleChecks,
  env,
  iamClientId,
  iamClientSecret,
  identityProvider,
  isDevelopment,
  orphanedPaymentCheckingTime,
  paymentServiceUrl,
  penaltyServiceUrl,
  port,
  postPaymentRedirectBaseUrl,
  publicAssets,
  redirectUri,
  region,
  urlRoot,
  views,
  paymentLimitDays,
};

export default config;
