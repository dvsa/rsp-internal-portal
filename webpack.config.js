const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const config = {
  output: {
    library: {
      type: 'commonjs2',
    },
  },
  resolve: {
    extensions: ['.js'],
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
        type: 'javascript/auto',
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
  target: 'node',
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
  stats: {
    colors: true,
  },
  mode: 'production',
};

module.exports = [
  {
    ...config,
    entry: { handler: './src/handler.js' },
    plugins: [
      ...config.plugins,
      new CopyWebpackPlugin({
        patterns: [
          { from: 'build/server/views', to: 'views/' },
          { from: 'build/public', to: 'public/', globOptions: { ignore: ['**/images/**'] } },
        ],
      }),
    ],
  },
  { ...config, entry: { app: './src/server/app.js' } },
];
