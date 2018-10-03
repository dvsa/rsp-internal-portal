import awsServerlessExpress from 'aws-serverless-express';
import app from '../server/app';
import config from '../server/config';
import modifyPath from '../server/utils/modifyPath';

// NOTE: If you get ERR_CONTENT_DECODING_FAILED in your browser, this is likely
// due to a compressed response (e.g. gzip) which has not been handled correctly
// by aws-serverless-express and/or API Gateway. Add the necessary MIME types to
// binaryMimeTypes below, then redeploy.
const binaryMimeTypes = [
  'application/javascript',
  'application/json',
  'application/octet-stream',
  'application/xml',
  'font/eot',
  'font/opentype',
  'font/otf',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'text/comma-separated-values',
  'text/css',
  'text/html',
  'text/javascript',
  'text/plain',
  'text/text',
  'text/xml',
];

function isProd() {
  const envVar = config.env();
  return typeof envVar !== 'undefined' && envVar === 'production';
}

let lambdaExpressServer;
export default async (event, context) => {
  if (!lambdaExpressServer) {
    console.log('Creating new Express server');
    const expressApp = await app();
    lambdaExpressServer = awsServerlessExpress.createServer(expressApp, null, binaryMimeTypes);
  }
  if (isProd()) {
    event.path = modifyPath(event.path); // eslint-disable-line
  }
  return awsServerlessExpress.proxy(lambdaExpressServer, event, context);
};
