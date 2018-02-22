/* eslint-disable */
const gulp = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const notify = require('gulp-notify');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const gulpIf = require('gulp-if');
const CONFIG = require('./../constants').CONFIG;

function processScss() {
  return gulp.src(path.join(CONFIG.sourcePaths.scss, CONFIG.patterns.scss))
    // Enable source maps for development
    .pipe(gulpIf(!CONFIG.isProduction, sourcemaps.init()))
    // Include node_modules folder to allow for imports
    .pipe(sass({
      includePaths: [
        'node_modules',
      ],
    }))
    // If error occures, display error instead of crashing
    .on('error', notify.onError('Error: <%= error.message %>'))
    // Add browser specific prefixes
    .pipe(autoprefixer({
      browsers: [
        'ie 8',
        'ie 9',
        'ie 10',
        'ie 11',
        'last 2 versions',
      ],
    }))
    // If in production, minify the css
    .pipe(gulpIf(CONFIG.isProduction, cssnano({
      minifyFontValues: false,
      discardComments: {
        removeAll: true,
      },
    })))
    // Output source maps for development
    .pipe(gulpIf(!CONFIG.isProduction, sourcemaps.write('./')))
    // Output compiled css to the distribution folder
    .pipe(gulp.dest(CONFIG.distPaths.css));
}

gulp.task('scss', processScss);
