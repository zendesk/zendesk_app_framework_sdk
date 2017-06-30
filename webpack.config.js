const path = require('path');
const pkg = require('./package.json');

const { 
  DefinePlugin,
  optimize: {
    UglifyJsPlugin,
    ModuleConcatenationPlugin
  }
} = require('webpack');

module.exports = function (env) {
  return {
    entry: './lib/index.js',

    context: __dirname,
  
    target: 'web',
    
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'zaf_sdk.js',
      library: 'ZAFClient',
      libraryTarget: 'window'
    },
  
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [
            path.resolve(__dirname, 'lib'),
            path.resolve(__dirname, 'spec')
          ],
          enforce: 'pre',
          loader: 'eslint-loader'
        },
        {
          test: /\.js$/,
          include: [
            path.resolve(__dirname, 'lib'),
            path.resolve(__dirname, 'spec')
          ],
          loader: 'babel-loader'
        }
      ]
    },
  
    plugins: [
      new ModuleConcatenationPlugin(),
      new DefinePlugin({
        VERSION: JSON.stringify(pkg.version)
      })
    ],
  
    devServer: {
      contentBase: path.join(__dirname, "build"),
      publicPath: 'public',
      port: 9001
    }
  };
};