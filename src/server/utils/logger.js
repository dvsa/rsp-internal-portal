import { createLogger, transports, format } from 'winston';
import config from '../config';

export default createLogger({
  format: format.prettyPrint(),
  json: true,
  transports: [
    // Console logs are shown on CloudWatch so this should be enough for time being
    new transports.Console({
      level: config.isDevelopment ? 'debug' : 'error',
    }),
  ],
});
