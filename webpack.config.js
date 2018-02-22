const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    handler: './src/handler.js',
    app: './src/server/app.local.js',
  },
  output: {
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
  },
  target: 'node',
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          emitError: true,
          emitWarning: true,
          failOnError: true,
          failOnWarning: false,
        },
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: 'build/server/views', to: 'views/' },
      { from: 'build/public', to: 'public/' },
    ]),
  ],
  stats: {
    colors: true,
  },
  devtool: 'source-map',
};

