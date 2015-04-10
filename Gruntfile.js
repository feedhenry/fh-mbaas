'use strict';

module.exports = function(grunt) {
  require('time-grunt')(grunt);

  // dist related variables
  var pkgName = 'fh-mbaas';
  var distDir = './dist';
  var outputDir = './output';
  var pkgjs = require('./package.json');
  var buildNumber = (process.env['BUILD_NUMBER'] || 'BUILD-NUMBER');
  var packageVersion = pkgjs.version + '-' + buildNumber;
  var releaseDir = pkgName + '-' + packageVersion;
  var releaseFile = pkgName + '-' + packageVersion + '.tar.gz';

  // Project Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      js: {
        files: ['gruntfile.js', 'fh-mbaas.js', 'lib/**/*.js', 'test/**/*.js'],
        options: {
          livereload: true
        }
      },
      html: {
        files: ['public/views/**', 'app/views/**'],
        options: {
          livereload: true
        }
      }
    },
    nodemon: {
      dev: {
        script: 'fh-mbaas.js',
        options: {
          args: ['config/dev.json'],
          ignore: ['public/**'],
          ext: 'js,html',
          nodeArgs: [],
          delayTime: 1,
          env: {
            PORT: 3000
          },
          cwd: __dirname
        }
      }
    },
    concurrent: {
      serve: ['nodemon', 'watch'],
      debug: ['node-inspector', 'shell:debug', 'open:debug'],
      options: {
        logConcurrentOutput: true
      }
    },
    env : {
      options : {},
      // environment variables - see https://github.com/jsoverson/grunt-env for more information
      local: {
        FH_USE_LOCAL_DB: true
      }
    },
    'node-inspector': {
      dev: {}
    },
    jshint: {
      //all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js']
      all: ['fh-mbaas.js', 'lib/**/*.js']
    },
    shell: {
      debug: {
        options: {
          stdout: true
        },
        command: 'env NODE_PATH=. node --debug-brk fh-mbaas.js ./config/dev.json -d'
      },
      unit: {
        options: {
          stdout: true,
          stderr: true,
          failOnError: true,
          execOptions: {
            maxBuffer: 1048576
          }
        },
        command: 'env NODE_PATH=. ./node_modules/.bin/turbo test/unit/**/*.js'
      },
      accept: {
        options: {
          stdout: true,
          stderr: true,
          failOnError: true,
          execOptions: {
            maxBuffer: 1048576
          }
        },
        // some database trouncing going on here at the moment, tests need to run in a particular order, these all need a refactor
        command:
          'env NODE_PATH=. ./node_modules/.bin/turbo --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js'
      },
      coverage_unit: {
        options: {
          stdout: true,
          stderr: true,
          failOnError: true,
          execOptions: {
            maxBuffer: 1048576
          }
        },
        command: [
          'rm -rf coverage cov-unit cov-accept',
          'env NODE_PATH=. ./node_modules/.bin/istanbul cover --dir cov-unit ./node_modules/.bin/turbo -- test/unit/**/*.js',
          './node_modules/.bin/istanbul report',
          'echo "See html coverage at: `pwd`/coverage/lcov-report/index.html"'
        ].join('&&')
      },
      coverage_accept: {
        options: {
          stdout: true,
          stderr: true,
          failOnError: true,
          execOptions: {
            maxBuffer: 1048576
          }
        },
        command: [
          'rm -rf coverage cov-unit cov-accept',
          'env NODE_PATH=. ./node_modules/.bin/istanbul cover --dir cov-accept ./node_modules/.bin/turbo -- --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js',
          './node_modules/.bin/istanbul report',
          './node_modules/.bin/istanbul report --report cobertura',
          'echo "See html coverage at: `pwd`/coverage/lcov-report/index.html"'
        ].join('&&')
      },
      dist: {
        options: {
          stdout: true,
          stderr: true,
          failOnError: true
        },
        command: [
          'rm -rf ' + distDir + ' ' + outputDir + ' ' + releaseDir,
          'mkdir -p ' + distDir + ' ' + outputDir + '/' + releaseDir,
          'cp -r ./lib ' + outputDir + '/' + releaseDir,
          'cp -r ./scripts ' + outputDir + '/' + releaseDir,
          'cp ./package.json ' +  outputDir + '/' + releaseDir,
          'cp ./fh-mbaas.js ' +  outputDir + '/' + releaseDir,
          'echo ' +  packageVersion + ' > ' + outputDir + '/' + releaseDir + '/VERSION.txt',
	        'tar -czf ' + distDir + '/' + releaseFile + ' -C ' + outputDir + ' ' + releaseDir
        ].join('&&')
      }
    },
    open: {
      debug: {
        path: 'http://127.0.0.1:8080/debug?port=5858',
        app: 'Google Chrome'
      },
      platoReport: {
        path: './plato/index.html',
        app: 'Google Chrome'
      }
    },
    plato: {
      src: {
        options : {
          jshint : grunt.file.readJSON('.jshintrc')
        },
        files: {
          'plato': ['lib/**/*.js']
        }
      }
    }
  });

  // Load NPM tasks
  require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});

  // Testing tasks
  grunt.registerTask('test', ['shell:unit', 'shell:accept']);
  grunt.registerTask('unit', ['jshint', 'shell:unit']);
  grunt.registerTask('accept', ['env:local', 'shell:accept']);

  // Coverage tasks
  grunt.registerTask('coverage', ['jshint', 'shell:coverage_unit', 'shell:coverage_accept']);
  grunt.registerTask('coverage-unit', ['shell:coverage_unit']);
  grunt.registerTask('coverage-accept', ['env:local', 'shell:coverage_accept']);

  // dist command
  grunt.registerTask('dist', ['shell:dist']);

  // Making grunt default to force in order not to break the project.
  //grunt.option('force', true);

  grunt.registerTask('analysis', ['plato:src', 'open:platoReport']);

  grunt.registerTask('serve', ['env:local', 'concurrent:serve']);
  grunt.registerTask('debug', ['env:local', 'concurrent:debug']);
  grunt.registerTask('default', ['serve']);
};
