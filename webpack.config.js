const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    handler: './src/handler.js',
    app: './src/server/app.js',
  },
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
