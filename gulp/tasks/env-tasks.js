/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const CONFIG = require('./../constants').CONFIG;

function watchDev() {
  // Watch all scss files inside of the source folder
  // If any changes occur then run the scss task
  gulp.watch(path.join(CONFIG.sourcePaths.scss, CONFIG.patterns.scss), gulp.parallel('scss'));

  // Watch all IE shims js changes
  // If any changes occur then run javascripts-ie-shims task
  gulp.watch(path.join(CONFIG.sourcePaths.js, 'ie-shims', CONFIG.patterns.js), gulp.parallel('javascript-ie-shims'));
}

gulp.task('watch-dev', gulp.series('copy-images', 'copy-fonts', 'copy-misc', 'scss', 'javascript-ie-shims', 'govuk-elements', watchDev));

gulp.task('build-production', gulp.series('copy-images', 'copy-fonts', 'copy-misc', 'scss', 'javascript-ie-shims', 'govuk-elements'));
