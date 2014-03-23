'use strict';

var path = require('path'),
    CACHE_PATH = path.resolve('./tmp/.cache') + '/';

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
        'cache-path': CACHE_PATH + 'gluejs'
      },
      build: {
        options: {
          export: 'ZAFClient'
        },
        src: 'lib/**/*.js',
        dest: 'build/zaf_client.js'
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
      my_target: {
        files: {
          'build/zaf_client.min.js': ['build/zaf_client.js']
        }
      }
    },
    testem: {
      default: {
        src: [
          '<%= gluejs.test.dest %>',
          'node_modules/sinon/pkg/sinon.js',
          'node_modules/sinon-chai/lib/sinon-chai.js',
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
        cache: CACHE_PATH + 'newer'
      }
    },
    connect: {
      server: {
        options: {
          port: 9001,
          base: 'public',
          keepalive: true
        }
      },
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['default']
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

  grunt.registerTask('test', ['newer:jshint', 'gluejs:test', 'testem']);
  grunt.registerTask('build', ['newer:jshint', 'gluejs:build', 'uglify']);
  grunt.registerTask('default', ['build']);
};
