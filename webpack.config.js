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
    fallback: {
      path: false,
      crypto: false,
      os: false,
      stream: false,
      fs: false,
      net: false,
      http: false,
      https: false,
      zlib: false,
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
