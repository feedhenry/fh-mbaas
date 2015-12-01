module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({

    _test_runner: '_mocha',

    _unit_args: '-A -u exports --recursive -t 10000 ./test/unit',
    optional: ['mocha -A -u exports --recursive -t 10000 test/accept/test-backoff.js'],

    unit: ['echo $NODE_PATH', '<%= _test_runner %> <%= _unit_args %>'],

    accept: ['turbo --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js test/accept/test-dataSourceUpdater.js'],

    unit_cover: ['istanbul cover --dir cov-unit ./node_modules/.bin/turbo -- --setUp=test/setup.js test/unit/**/*.js'],

    accept_cover: [
      'istanbul cover --dir cov-accept ./node_modules/.bin/turbo -- --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js'
    ]
  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.registerTask('default', ['fh:dist']);

  grunt.registerTask('coverage', ['fh:coverage']);
};
