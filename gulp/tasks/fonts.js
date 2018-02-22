/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const CONFIG = require('./../constants').CONFIG;

function copyFonts() {
  return gulp.src(path.join(CONFIG.sourcePaths.fonts, CONFIG.patterns.font))
    // Outputs file to the distribution folder
    .pipe(gulp.dest(CONFIG.distPaths.fonts));
}

gulp.task('copy-fonts', copyFonts);
