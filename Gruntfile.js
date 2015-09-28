module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    unit: ['turbo --setUp=test/setup.js test/unit/**/*.js'],

    accept: [
      'turbo --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js',
      'mocha -A -u exports --recursive -t 10000 test/accept/test-backoff.js'
    ],

    unit_cover: ['istanbul cover --dir cov-unit ./node_modules/.bin/turbo -- --setUp=test/setup.js test/unit/**/*.js'],

    accept_cover: [
      'istanbul cover --dir cov-accept ./node_modules/.bin/turbo -- --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js',
      'istanbul cover --dir cov-accept _mocha -- -A -u exports --recursive -t 10000 test/accept/test-backoff.js'
    ]
  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.registerTask('default', ['fh:dist']);

  grunt.registerTask('coverage', ['fh:coverage']);
};
