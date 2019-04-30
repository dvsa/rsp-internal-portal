import path from 'path';

module.exports = {
  entry: {
    dvsa: path.resolve('src', 'public', 'js', 'dvsa', 'index.js'),
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve('public', 'javascripts'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [
              ['@babel/env', {
                targets: {
                  browsers: [
                    'last 3 versions',
                    'ie >= 8',
                    'last 3 iOS major versions',
                  ],
                },
                debug: false,
                useBuiltIns: 'entry',
                corejs: '2',
              }],
            ],
            plugins: [
              ['@babel/plugin-proposal-class-properties', { loose: false }],
            ],
          },
        },
      },
    ],
  },
};
