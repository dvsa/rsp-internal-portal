/* eslint-disable */
import path from 'path';
import webpack from 'webpack';
import common from './webpack.config.common.babel';
import merge from 'webpack-merge';

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve('build', 'public', 'javascripts'),
  },
  watch: false,
});
