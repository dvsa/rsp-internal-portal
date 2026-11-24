/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const gulpIf = require('gulp-if');
const CONFIG = require('./../constants').CONFIG;

function copyGovUk() {
  return gulp.src(`${CONFIG.sourcePaths.govUk}/**`, { encoding: false })
    .pipe(gulp.dest(CONFIG.distPaths.govUk));
}

gulp.task('govuk-elements', copyGovUk);
