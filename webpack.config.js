const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    handler: './src/handler.js',
    app: './src/server/app.js',
  },
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.js'],
    fallback: {
      path: false,
      crypto: false,
      os: false,
    },
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: [{ fsevents: "require('fsevents')" }],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env'],
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'build/server/views', to: 'views/' },
        { from: 'build/public', to: 'public/' },
      ],
    }),
  ],
  stats: {
    colors: true,
  },
  mode: 'production',
};
