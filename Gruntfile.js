module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    unit: ['turbo test/unit/**/*.js'],

    accept: ['turbo --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js'],

    unit_cover: ['istanbul cover --dir cov-unit ./node_modules/.bin/turbo -- test/unit/**/*.js'],

    accept_cover: ['istanbul cover --dir cov-accept ./node_modules/.bin/turbo -- --series=true --setUp=test/accept/server.js --tearDown=test/accept/server.js test/accept/test-sys.js test/accept/test-api.js']
  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.registerTask('default', ['fh:dist']);

  grunt.registerTask('coverage', ['fh:coverage']);
  grunt.registerTask('dist', ['fh:default']);
};
