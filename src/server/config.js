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
};

export default config;
