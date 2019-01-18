/* eslint-disable global-require */
import 'babel-polyfill';
import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import nunjucks from 'nunjucks';
import path from 'path';
import _ from 'lodash';
import errorhandler from 'errorhandler';
import walkSync from 'walk-sync';
import resolvePath from 'resolve-path';
import validator from 'express-validator';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'cookie-session';
import config from './config';

const SIXTY_DAYS_IN_SECONDS = 5184000;

export default async () => {
  await config.bootstrap();

  // Create nunjucks fileloader instance for the views folder
  const nunjucksFileLoader = new nunjucks.FileSystemLoader(config.views(), {
    noCache: true,
  });

  const env = new nunjucks.Environment(nunjucksFileLoader, {
    autoescape: false,
    web: {
      useCache: false,
    },
  });

  const marcosPath = path.resolve(config.views(), 'macros');

  // Gets absolute path of each macro file
  const macros = walkSync(marcosPath, { directories: false })
    .map(file => resolvePath(marcosPath, file));

  env.addGlobal('macroFilePaths', macros);
  env.addGlobal('assets', config.isDevelopment() ? '' : config.publicAssets());
  env.addGlobal('urlroot', config.urlRoot());

  // Add lodash as a global for view templates
  env.addGlobal('_', _);

  const app = express();

  app.use(helmet());

  const assetsUrl = config.isDevelopment() ? 'http://localhost:3000/' : `${config.publicAssets()}/`;

  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", assetsUrl],
      scriptSrc: [
        assetsUrl,
        'https://www.googletagmanager.com/',
        'https://www.google-analytics.com/',
        'https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/',
      ],
      fontSrc: ['data:'],
      imgSrc: [
        assetsUrl,
        'https://www.google-analytics.com/',
        'https://stats.g.doubleclick.net/',
        'https://www.google.co.uk/ads/',
        'https://www.google.com/ads/',
      ],
    },
  }));
  app.use(helmet.hsts({
    maxAge: SIXTY_DAYS_IN_SECONDS,
  }));

  // Add express to the nunjucks enviroment instance
  env.express(app);

  app.use(session({
    maxAge: 1000 * 60 * 60 * 4, // 4 hours
    name: 'rsp_internal_portal_user',
    // TODO: clientSecret will be removed eventually, will need to use a different app secret
    secret: config.clientSecret(),
  }));

  // Create a view engine from nunjucks enviroment variable
  app.engine('njk', env.render);

  // Set the express view engine to the above created view engine
  app.set('view engine', 'njk');
  app.set('view cache', false);

  // Disable powered by express in header
  app.set('x-powered-by', false);

  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(validator());
  // Always sanitizes the body
  app.use((req, res, next) => {
    Object.keys(req.body).forEach((item) => {
      req.sanitize(item).escape();
    });
    next();
  });

  app.use(cookieParser());
  app.use(awsServerlessExpressMiddleware.eventContext());
  app.use('/', require('./routes'));

  app.use(errorhandler());
  return app;
};
