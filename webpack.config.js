const path = require('path')
const packageJson = require('./package.json')

function config (env = {}) {
  const config = {
    mode: env.production ? 'production' : 'development',

    entry: {
      zaf_sdk: [
        'native-promise-only',
        './lib/index.js'
      ]
    },

    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist')
    },

    externals: {
      version: `"${packageJson.version}"`
    },

    devServer: {
      contentBase: path.join(__dirname, 'dist'),
      compress: true,
      port: 9001
    }
  }

  return config
}

module.exports = config
