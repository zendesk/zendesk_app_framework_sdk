const path = require('path')
const packageJson = require('./package.json')

module.exports = function (env = {}) {
  const config = {
    mode: env.production ? 'production' : 'development',
    devtool: 'cheap-module-source-map',

    entry: {
      zaf_sdk: [
        'native-promise-only',
        './lib/index.js'
      ]
    },

    module: {
      rules: []
    },

    plugins: [],

    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'build')
    },

    externals: {
      version: `"${packageJson.version}"`
    },

    devServer: {
      contentBase: path.join(__dirname, 'build'),
      compress: true,
      port: 9001
    }
  }

  return config
}
