const gulp = require('gulp');
const requireDir = require('require-dir');
const forwardReference = require('undertaker-forward-reference');
const CONFIG = require('./gulp/constants').CONFIG;

gulp.registry(forwardReference());

requireDir(CONFIG.gulpTasksPath);
