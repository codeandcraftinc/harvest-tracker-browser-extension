var webpack = require('webpack');

module.exports = {
  entry: './lib/extension/main.js',
  output: {
    path: 'dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loaders: ['babel']
    },{
      test: /\.scss$/,
      loaders: ['style', 'css', 'sass']
    },{
      test: /\.png$/,
      loaders: ['url']
    }]
  }
};
