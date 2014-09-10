var async = require('async');
var util = require('util');
var _ = require('underscore');
var assert = require('assert');
var common = require('../util/common.js');

module.exports = function(config) {
  assert.ok(config, 'Config is null');

  var teams;
  var bos;

  function init(mongoConnection) {
    if (config.mongo.enabled === true) {
      assert.ok(mongoConnection, 'No mongo connection!');

      /*
      teams = require('./mongo/teams.js')();
      bos = require('./mongo/bos.js')();

      var models = require('./mongo/models.js')(mongoConnection);
      models.init();
      teams.init(models.get('Team'));
      bos.init(models.get('Bos'));
       */
    }else {
      //teams = require('./inmem/teams.js')();
      //bos = require('./inmem/bos.js')();
    }
  }


  return {
    init: init
  };
};