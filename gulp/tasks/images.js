/* eslint-disable */
const gulp = require('gulp');
const path = require('path');
const { Transform } = require('node:stream');
const sharp = require('sharp');
const CONFIG = require('./../constants').CONFIG;

function compressImages() {
  return new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      const extension = file.extname.toLowerCase();
      if (!file.isBuffer() || !['.png', '.jpg', '.jpeg'].includes(extension)) {
        callback(null, file);
        return;
      }

      const image = sharp(file.contents);
      const compressed = extension === '.png'
        ? image.png()
        : image.autoOrient().jpeg({ mozjpeg: true });

      compressed.toBuffer().then((contents) => {
        if (contents.length < file.contents.length) {
          file.contents = contents;
        }
        callback(null, file);
      }, callback);
    },
  });
}

function copyImages() {
  const images = gulp.src(path.join(CONFIG.sourcePaths.images, CONFIG.patterns.image));
  const output = gulp.dest(CONFIG.distPaths.images);
  return CONFIG.isProduction ? images.pipe(compressImages()).pipe(output) : images.pipe(output);
}

gulp.task('copy-images', copyImages);
