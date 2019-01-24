/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const CONFIG = require('./../constants').CONFIG;

function copyScripts() {
  return gulp.src(path.join(CONFIG.sourcePaths.js, '*.js'))
    // Outputs file to the distribution folder
    .pipe(gulp.dest(CONFIG.distPaths.js));
}

gulp.task('copy-scripts', copyScripts);
