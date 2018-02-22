/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const CONFIG = require('./../constants').CONFIG;

function copyMisc() {
  return gulp.src(path.join(CONFIG.sourcePaths.misc, '**/*.*'))
    // Outputs file to the distribution folder
    .pipe(gulp.dest(CONFIG.distPaths.misc));
}

gulp.task('copy-misc', copyMisc);