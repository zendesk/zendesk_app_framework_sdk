const webpackConfig = require('./webpack.config')({
  dev: true
});

const customLaunchers = {
  SL_IE_Windows_8_1: {
    base:        'SauceLabs',
    browserName: 'internet explorer',
    version:     'latest',
    platform:    'Windows 8.1'
  },
  SL_MicrosoftEdge_Latest_Windows_10: {
    base:        'SauceLabs',
    browserName: 'MicrosoftEdge',
    version:     'latest',
    platform:    'Windows 10'
  },
  SL_Firefox_OSX_Prev_10_12: {
    base:        'SauceLabs',
    browserName: 'firefox',
    version:     'latest-1',
    platform:    'OS X 10.12'
  },
  SL_Firefox_OSX_Latest_10_12: {
    base:        'SauceLabs',
    browserName: 'firefox',
    version:     'latest',
    platform:    'OS X 10.12'
  },
  SL_Chrome_Prev_Linux: {
    base:        'SauceLabs',
    browserName: 'chrome',
    version:     'latest-1',
    platform:    'linux'
  },
  SL_Chrome_Latest_Linux: {
    base:        'SauceLabs',
    browserName: 'chrome',
    version:     'latest',
    platform:    'linux'
  },
  SL_Firefox_Prev_Windows_10: {
    base:        'SauceLabs',
    browserName: 'firefox',
    version:     'latest-1',
    platform:    'Windows 10'
  },
  SL_Firefox_Latest_Windows_10: {
    base:        'SauceLabs',
    browserName: 'firefox',
    version:     'latest',
    platform:    'Windows 10'
  },
  SL_Chrome_Prev_OSX_10_12: {
    base:        'SauceLabs',
    browserName: 'chrome',
    version:     'latest-1',
    platform:    'OS X 10.12'
  },
  SL_Chrome_Latest_OSX_10_12: {
    base:        'SauceLabs',
    browserName: 'chrome',
    version:     'latest',
    platform:    'OS X 10.12'
  },
  SL_Chrome_Prev_Windows_10: {
    base:        'SauceLabs',
    browserName: 'chrome',
    version:     'latest-1',
    platform:    'Windows 10'
  },
  SL_Chrome_Latest_Windows_10: {
    base:        'SauceLabs',
    browserName: 'chrome',
    version:     'latest',
    platform:    'Windows 10'
  }
};

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

    sauceLabs: {
      testName:     'zendesk_app_framework_sdk mocha tests',
      startConnect: true
    },

    preprocessors: {
      'spec/test_index.js': [
        'webpack',
        'sourcemap'
      ]
    },

    webpack: {
      devtool: 'inline-source-map',
      context: webpackConfig.context,
      module: webpackConfig.module,
      plugins: webpackConfig.plugins
    },

    webpackMiddleware: {
      noInfo: true,
      stats: 'errors-only'
    }
  });

  if (process.env.TRAVIS) {
    config.browsers = Object.keys(customLaunchers);
    config.browserNoActivityTimeout = 20000;
    config.browserDisconnectTolerance = 3;

    config.singleRun = true;

    config.sauceLabs.startConnect = false;
    config.sauceLabs.recordScreenshots = true;
    config.sauceLabs.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
    config.sauceLabs.build = `TRAVIS #${process.env.TRAVIS_BUILD_NUMBER} (${process.env.TRAVIS_BUILD_ID})`;
  }
};