'use strict';

var path = require('path'),
    CACHE_PATH = path.resolve('./tmp/.cache');

module.exports = function (grunt) {
  // Show elapsed time at the end
  require('time-grunt')(grunt);
  // Load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      options: {
        ignorePattern: ['lib/vendor/*']
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['lib/**/*.js']
      },
      test: {
        src: ['spec/**/*.js']
      }
    },
    copy: {
      vendor: {
        src: ['bower_components/native-promise-only/lib/npo.src.js'],
        dest: 'lib/vendor/native-promise-only.js'
      }
    },
    gluejs: {
      options: {
        basepath: './lib/',
        include: './lib/',
        'cache-path': path.join(CACHE_PATH, 'gluejs'),
        replace: {
          version: '"<%= pkg.version %>"'
        }
      },
      build: {
        options: {
          export: 'ZAFClient'
        },
        src: 'lib/**/*.js',
        dest: 'build/zaf_sdk.js'
      },
      test: {
        options: {
          globalRequire: true
        },
        src: '<%= gluejs.build.src %>',
        dest: 'tmp/test_build.js'
      }
    },
    uglify: {
      options: {
        mangle: false,
        sourceMap: true
      },
      build: {
        files: {
          'build/zaf_sdk.min.js': ['<%= gluejs.build.dest %>']
        }
      }
    },
    testem: {
      default: {
        src: [
          '<%= gluejs.test.dest %>',
          'node_modules/sinon/pkg/sinon.js',
          'node_modules/sinon-chai/lib/sinon-chai.js',
          'node_modules/chai-as-promised/lib/chai-as-promised.js',
          'spec/spec_helper.js',
          'spec/**/*_spec.js'
        ],
        options: {
          framework: 'mocha+chai',
          parallel: 8,
          launch_in_ci: ['PhantomJS'],
          launch_in_dev: ['PhantomJS', 'Chrome']
        }
      }
    },
    newer: {
      options: {
        cache: path.join(CACHE_PATH, 'newer')
      }
    },
    connect: {
      server: {
        options: {
          port: 9001,
          base: 'public'
        }
      }
    },
    watch: {
      gruntfile: {
        files: '<%= eslint.gruntfile.src %>',
        tasks: ['eslint:gruntfile']
      },
      lib: {
        files: '<%= eslint.lib.src %>',
        tasks: ['build']
      },
      test: {
        files: '<%= eslint.test.src %>',
        tasks: ['test']
      }
    },
    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        updateConfigs: ['pkg'],
        commit: true,
        commitMessage: 'v%VERSION%',
        commitFiles: '<%= bump.options.files %>',
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'v%VERSION%',
        push: false,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d'
      }
    }
  });

  grunt.registerTask('test', ['newer:eslint:test', 'copy:vendor', 'gluejs:test', 'testem:ci']);
  grunt.registerTask('build', ['newer:eslint:lib', 'copy:vendor', 'gluejs:build', 'uglify:build']);
  grunt.registerTask('test_build', ['newer:eslint:test', 'copy:vendor', 'gluejs:test']);
  grunt.registerTask('server', ['build', 'connect', 'watch:lib']);
  grunt.registerTask('default', 'server');
};
