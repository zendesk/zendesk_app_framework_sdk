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

    module: {
      rules: []
    },

    plugins: [],

    output: {
      library: 'ZAFClient',
      filename: '[name].js',
      path: path.resolve(__dirname, 'build')
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

  // For everything execpt tests we add optimization and babel
  if (!env.test) {
    config.optimization = {
      minimize: true,
      minimizer: [new UglifyJsPlugin({
        include: /\.min\.js$/,
        sourceMap: true
      })]
    }

    config.module.rules.push({
      test: /\.js$/,
      use: { loader: 'babel-loader', options: { plugins: [], presets: ['babel-preset-env'] } }
    })
  }

  if (env.stats) {
    const Visualizer = require('webpack-visualizer-plugin')
    config.plugins.push(new Visualizer({
      filename: './statistics.html'
    }))
  }

  return config
}
