var assert = require('assert');
var config = require('../../../lib/util/config');

var mockCfg = {
  'fhmbaas': {
    port: 8888,
    mongo: {
      enabled: true,
      host: 'localhost, test.example.com',
      port: 27017,
      name: 'testdb',
      auth: {
        enabled: true,
        user: 'testuser',
        pass: 'testpass'
      }
    }
  }
};

config.setConfig(mockCfg);

exports.it_should_get_config = function(finish){
  assert.ok(null != config.getConfig(), 'config is not set');
  finish();
};

exports.it_should_get_url_for_mongoose = function(finish){
  var url = config.getMongooseUrl();
  assert.equal(url, 'mongodb://testuser:testpass@localhost:27017/testdb,mongodb://test.example.com:27017');
  finish();
};

exports.it_should_return_yes = function(finish){
  var enabled = config.yes('fhmbaas.mongo.enabled');
  assert.ok(enabled, 'mongodb should be enabled');

  var not_enabled = config.yes('fhmbaas.not_exists');
  assert.ok(!not_enabled, 'not exists should not be enabled');
  finish();
};




