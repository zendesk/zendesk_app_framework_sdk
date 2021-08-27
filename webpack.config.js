const path = require('path')
const packageJson = require('./package.json')
const webpackMerge = require('webpack-merge')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
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

const plugins = [
  new UglifyJsPlugin({
    uglifyOptions: {
      include: /\.min\.js$/,
      mangle: true,
      warnings: false,
      sourceMap: true,
      screwIE8: true,
      compress: {
        collapse_vars: true,
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true
      },
      output: {
        comments: false
      }
    }
  })
]

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

  externals: {
    version: `"${packageJson.version}"`
  },

  // Note: devServer does not serve from build/, but from cache. It also doesn't respect mode
  // so outputed files are very different from server/build/build:dev
  devServer: {
    contentBase: path.join(__dirname, 'build'),
    compress: true,
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

  plugins,

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
