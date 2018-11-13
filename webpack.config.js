const path = require('path')
const packageJson = require('./package.json')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = function (env = {}) {
  const config = {
    mode: env.production ? 'production' : 'development',
    devtool: 'source-map',

    entry: {
      'zaf_sdk': [
        'native-promise-only',
        './lib/index.js'
      ],
      'zaf_sdk.min': [
        'native-promise-only',
        './lib/index.js'
      ]
    },

    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'build')
    },

    optimization: {
      minimize: true,
      minimizer: [new UglifyJsPlugin({
        include: /\.min\.js$/,
        sourceMap: true
      })]
    },

    externals: {
      version: `"${packageJson.version}"`
    },

    // Note: devServer does not serve from build/, but from cache. It also doesn't respect mode
    // so outputed files are very different from server/build/build:dev
    devServer: {
      contentBase: path.join(__dirname, 'build'),
      compress: true,
      port: 9001
    }
  }

  return config
}
