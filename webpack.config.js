const path = require('path')
const webpackMerge = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')
const Visualizer = require('webpack-visualizer-plugin')
const fs = require('fs')

const _resolveCache = new Map()
const resolve = (__path = '.') => {
  if (_resolveCache.has(__path)) {
    return _resolveCache.get(__path)
  }
  const resolved = path.resolve(__dirname, __path)
  if (fs.existsSync(resolved)) {
    const followed = fs.realpathSync(resolved)
    _resolveCache.set(__path, followed)
    return followed
  }
  _resolveCache.set(__path, resolved)
  return resolved
}

const optimization = {
  minimize: true,
  minimizer: [new TerserPlugin()]
}

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
    library: {
      name: 'ZAFClient',
      type: 'umd',
      export: 'default'
    },
    filename: '[name].js',
    sourceMapFilename: '[name].js.map',
    path: path.resolve(__dirname, 'build')
  },

  // Note: devServer does not serve from build/, but from cache. It also doesn't respect mode
  // so outputed files are very different from server/build/build:dev
  devServer: {
    static: {
      directory: path.join(__dirname, 'build')
    },
    hot: false,
    port: 9001
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        enforce: 'pre',
        include: [resolve('lib'), resolve('spec'), resolve('node_modules')],
        use: [
          {
            loader: 'babel-loader',
            options: {
              extends: resolve('.babelrc')
            }
          },
          {
            loader: 'ts-loader',
            options: {
              configFile: resolve('tsconfig.json')
            }
          }
        ]
      },
      {
        test: /\.js$/,
        include: [resolve('lib'), resolve('spec')],
        exclude: [
          resolve('spec/factories') // Factories are included raw in Lotus
        ],
        enforce: 'post',
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          babelrc: true
        }
      }
    ]
  },

  optimization,

  resolve: {
    modules: [resolve('lib'), resolve('spec'), resolve('node_modules')],
    extensions: ['.ts', '.js', '.hdbs', '.scss', '.css']
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

  if (env.stats) {
    config = webpackMerge(config, statsConfig)
  }

  return config
}
