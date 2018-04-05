import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function ensureRelativeUrl(url) {
  if (!url) {
    return '';
  }

  if (!url.startsWith('/')) {
    return `/${url}`;
  }

  return url;
}

const env = process.env.NODE_ENV || 'development';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const isDevelopment = env === 'development';
const urlRoot = ensureRelativeUrl(process.env.URL_ROOT);
const assets = process.env.PUBLIC_ASSETS || path.resolve(__dirname, '..', 'public');
const views = process.env.VIEWS || path.resolve(__dirname, 'views');
const clientId = process.env.CLIENT_ID || 'client';
const clientSecret = process.env.CLIENT_SECRET || 'secret';
const penaltyServiceUrl = process.env.PENALTY_SERVICE_URL;
const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL;
const identityProvider = process.env.IDENTITY_PROVIDER;
const redirectUri = process.env.REDIRECT_URI;
const region = process.env.REGION;
const userPoolId = process.env.COGNITO_USERPOOL_ID;
const cognitoUrl = process.env.COGNITO_URL;
const cpmsServiceUrl = process.env.CPMS_SERVICE_URL;

const config = {
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
};

export default config;
