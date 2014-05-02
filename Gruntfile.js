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
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
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
    gluejs: {
      options: {
        basepath: './lib/',
        include: './lib/',
        'cache-path': path.join(CACHE_PATH, 'gluejs')
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
      build: {
        files: {
          'build/zaf_sdk.min.js': ['<%= gluejs.build.src %>']
        }
      }
    },
    testem: {
      default: {
        src: [
          '<%= gluejs.test.dest %>',
          'node_modules/sinon/pkg/sinon.js',
          'node_modules/sinon-chai/lib/sinon-chai.js',
          'node_modules/es5-shim/es5-shim.js',
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
      },
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['build']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['test']
      }
    }
  });

  grunt.registerTask('test', ['newer:jshint:test', 'gluejs:test', 'testem:ci']);
  grunt.registerTask('build', ['newer:jshint:lib', 'gluejs:build', 'uglify:build']);
  grunt.registerTask('server', ['build', 'connect', 'watch:lib']);
  grunt.registerTask('default', 'server');
};
