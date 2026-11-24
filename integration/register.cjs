'use strict';

const path = require('node:path');

require('@babel/register')({
  cwd: path.join(__dirname, '..'),
  configFile: path.join(__dirname, '..', '.babelrc'),
  babelrc: false,
});
