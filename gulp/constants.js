const path = require('path');

const BASE_FOLDER_PATH = path.resolve('');
const SRC_FOLDER_PATH = path.resolve('src');
const SRC_ASSETS_FOLDER_PATH = path.join(SRC_FOLDER_PATH, 'public');
const NODE_MODULES_PATH = path.resolve('node_modules');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DIST_FOLDER_PATH = IS_PRODUCTION ? path.resolve('dist', 'public') : path.resolve('build', 'public');

const CONFIG = {
  isProduction: IS_PRODUCTION,
  patterns: {
    js: '**/*.js',
    image: '**/*.{png,jpg,jpeg,gif,svg}',
    css: '**/*.css',
    scss: '**/*.scss',
    font: '**/*.{eot,woff}',
  },
  gulpTasksPath: path.resolve('gulp', 'tasks'),
  distPaths: {
    base: DIST_FOLDER_PATH,
    css: path.join(DIST_FOLDER_PATH, 'stylesheets'),
    js: path.join(DIST_FOLDER_PATH, 'javascripts'),
    images: path.join(DIST_FOLDER_PATH, 'images'),
    govCSS: path.join(DIST_FOLDER_PATH, 'gov-css'),
    fonts: path.join(DIST_FOLDER_PATH, 'fonts'),
    misc: path.join(DIST_FOLDER_PATH, 'misc'),
    govUk: path.join(DIST_FOLDER_PATH, 'govuk'),
  },
  sourcePaths: {
    base: path.join(SRC_ASSETS_FOLDER_PATH, 'assets'),
    scss: path.join(SRC_ASSETS_FOLDER_PATH, 'scss'),
    images: path.join(SRC_ASSETS_FOLDER_PATH, 'img'),
    js: path.join(SRC_ASSETS_FOLDER_PATH, 'js'),
    fonts: path.join(SRC_ASSETS_FOLDER_PATH, 'fonts'),
    misc: path.join(SRC_ASSETS_FOLDER_PATH, 'misc'),
    govUk: path.join(SRC_ASSETS_FOLDER_PATH, 'govuk'),
  },
  configFiles: {
    scssLink: path.join(BASE_FOLDER_PATH, '.scss-lint.yml'),
  },
};

module.exports = {
  BASE_FOLDER_PATH,
  SRC_FOLDER_PATH,
  SRC_ASSETS_FOLDER_PATH,
  NODE_MODULES_PATH,
  IS_PRODUCTION,
  DIST_FOLDER_PATH,
  CONFIG,
};

