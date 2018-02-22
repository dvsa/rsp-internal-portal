/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const concat = require('gulp-concat');
const CONFIG = require('./../constants').CONFIG;

function copyIeShims() {
  return gulp.src(path.join(CONFIG.sourcePaths.js, 'ie-shims', CONFIG.patterns.js))
    // Concatenate and Rename output filename
    .pipe(concat('ie-shims.bundle.js'))
    // Outputs file to the distribution folder
    .pipe(gulp.dest(CONFIG.distPaths.js));
}

gulp.task('javascript-ie-shims', copyIeShims);
