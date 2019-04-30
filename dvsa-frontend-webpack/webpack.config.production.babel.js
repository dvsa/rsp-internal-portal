/* eslint-disable */
import path from 'path';
import common from './webpack.config.common.babel';
import merge from 'webpack-merge';
import webpack from 'webpack';

module.exports = merge(common, {
  output: {
    filename: '[name].bundle.js',
    path: path.resolve('dist', 'public', 'javascripts'),
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin()
  ],
});
