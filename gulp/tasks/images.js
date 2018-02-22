/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const gulpIf = require('gulp-if');
const imagemin = require('gulp-imagemin');
const CONFIG = require('./../constants').CONFIG;

function copyImages() {
  return gulp.src(path.join(CONFIG.sourcePaths.images, CONFIG.patterns.image))
    .pipe(gulpIf(CONFIG.isProduction, imagemin({
      optimizationLevel: 3,
    })))
    // Outputs file to the distribution folder
    .pipe(gulp.dest(CONFIG.distPaths.images));
}

gulp.task('copy-images', copyImages);
