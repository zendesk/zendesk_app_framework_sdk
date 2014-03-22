'use strict';

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
        export: 'ZAFClient'
      },
      build: {
        src: 'lib/**/*.js',
        dest: 'build/zaf_client.js'
      }
    },
    uglify: {
      my_target: {
        files: {
          'build/zaf_client.min.js': ['build/zaf_client.js']
        }
      }
    },
    mochaRunner: {
      all: {
        scripts: [
          'build/zaf_client.js',
          'spec/**/*.js'
        ]
      }
    },
    mocha: {
      options: {
        run: true,
        reporter: 'Spec',
      },
      test: {
        options: {
          urls: ['http://localhost:8000']
        }
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test']
      }
    }
  });

  grunt.registerTask('test', ['jshint', 'gluejs', 'mochaRunner', 'mocha']);
  grunt.registerTask('build', ['jshint', 'gluejs', 'uglify']);
  grunt.registerTask('default', ['build']);

};
