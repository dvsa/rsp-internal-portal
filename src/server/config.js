import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import dotenv from 'dotenv';
import path from 'path';
import { logError, logInfo } from './utils/logger';

dotenv.config();

const configMetadata = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  entraUrl: 'ENTRA_URL',
  tenantId: 'TENANT_ID',
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
  featureBypassExpiryDate: 'FEATURE_BYPASS_EXPIRY_DATE',
};

let configuration = {};
async function bootstrap({ local = false } = {}) {
  if (process.env.USE_SECRETS_MANAGER === 'true') {
    const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
    logInfo('InternalPortalSecretsManagerId', { secretId: SecretId });
    const secretsManagerClient = new SecretsManagerClient({ region: process.env.REGION });
    let response;
    try {
      response = await secretsManagerClient.send(new GetSecretValueCommand({ SecretId }));
    } catch (err) {
      logError('InternalPortalSecretsManagerError', err.message);
      throw err;
    }
    try {
      configuration = JSON.parse(response.SecretString);
    } catch (err) {
      logError('InternalPortalSecretsManagerError', 'Invalid or missing secret JSON');
      throw new Error('Secrets Manager returned invalid or missing secret JSON');
    }
    if (local) {
      // Use local environment variables to override the Secrets Manager values for local development.
      // This is needed because the secrets manager values are for the deployed environment, and local development needs different values for URL_ROOT and REDIRECT_URI.
      configuration = { ...configuration, URL_ROOT: process.env.URL_ROOT, REDIRECT_URI: process.env.REDIRECT_URI };
    }
  } else {
    logInfo('InternalPortalEnvVars', 'Using envvars for config');
    configuration = Object.values(configMetadata)
      .reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
  }
  return configuration;
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

function tenantId() {
  return configuration[configMetadata.tenantId] || 'tenant';
}

function entraUrl() {
  return configuration[configMetadata.entraUrl];
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
  return Number(configuration[configMetadata.orphanedPaymentCheckingTime] || 1800000);
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
  const days = process.env[configMetadata.paymentLimitDays];
  if (days) {
    return Number.isNaN(Number(days)) ? defaultDays : Number(days);
  }
  return defaultDays;
}

function featureBypassExpiryDate() {
  return process.env[configMetadata.featureBypassExpiryDate] === 'true';
}

const config = {
  bootstrap,
  clientId,
  clientSecret,
  tenantId,
  entraUrl,
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
  featureBypassExpiryDate,
};

export default config;
