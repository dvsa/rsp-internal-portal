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
              ['env', {
                targets: {
                  browsers: [
                    'last 3 versions',
                    'ie >= 8',
                    'last 3 iOS major versions',
                  ],
                },
                debug: true,
                useBuiltIns: true,
              }],
              'stage-2',
              'stage-3',
            ],
          },
        },
      },
    ],
  },
};
