module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({

    _test_runner: '_mocha',

    _unit_args: '-b -A -u exports -t 10000',
    optional: ['mocha -A -u exports --recursive -t 10000 test/accept/test-backoff.js'],

    unit: ['echo $NODE_PATH', '<%= _test_runner %> <%= _unit_args %> --recursive ./test/unit/**/test*.js'],

    // use `grunt fh:testfile:{{unit_test_filename}}` to run a single test file
    unit_single: ['<%= _test_runner %> <%= _unit_args %> <%= unit_test_filename %>'],

    accept: ['turbo --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js test/accept/test-dataSourceUpdater.js'],

    unit_cover: ['istanbul cover --dir cov-unit -- node_modules/.bin/_mocha <%= _unit_args %> --recursive ./test/unit/**/test*.js'],

    accept_cover: [
      'istanbul cover --dir cov-accept ./node_modules/.bin/turbo -- --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js'
    ]
  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.registerTask('default', ['eslint', 'fh:dist']);

  grunt.registerTask('coverage', ['fh:coverage']);
};
