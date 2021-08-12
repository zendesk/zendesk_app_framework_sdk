const path = require('path')
const packageJson = require('./package.json')
const webpackMerge = require('webpack-merge')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const Visualizer = require('webpack-visualizer-plugin')

const commonConfig = {
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
    library: 'ZAFClient',
    libraryExport: 'default',
    filename: '[name].js',
    path: path.resolve(__dirname, 'build')
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
const nonTestConfig = {
  optimization: {
    minimize: true,
    minimizer: [
      new UglifyJsPlugin({
        include: /\.min\.js$/,
        sourceMap: true
      })
    ]
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: { loader: 'babel-loader', options: { plugins: [], presets: ['babel-preset-env'] } }
      }
    ]
  }
}

const statsConfig = {
  plugins: [
    new Visualizer({
      filename: './statistics.html'
    })
  ]
}

module.exports = function (env = {}) {
  let config = webpackMerge(commonConfig, {
    mode: env.production ? 'production' : 'development'
  })

  if (!env.test) {
    config = webpackMerge(config, nonTestConfig)
  }

  if (env.stats) {
    config = webpackMerge(config, statsConfig)
  }

  return config
}
