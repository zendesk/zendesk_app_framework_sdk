const webpackConfig = require('./webpack.config')('dev');
module.exports = function(config) {
  config.set({
    frameworks: [
      'mocha',
      'chai',
      'sinon-chai',
      'chai-as-promised'
    ],

    files: [
      {
        pattern: 'spec/test_index.js',
        watched: false
      },
    ],

    browsers: [
      'Chrome'
    ],

    reporters: [
      'mocha'
    ],

    preprocessors: {
      'spec/test_index.js': ['webpack']
    },

    webpack: {
      context: webpackConfig.context,
      module: webpackConfig.module,
      plugins: webpackConfig.plugins
    },

    webpackMiddleware: {
      stats: 'errors-only'
    }
  });
};