var assert = require('assert');
var util = require('util');
var exceptionMessages = {};

exceptionMessages.MISSING_CONFIG = "The Config file %s or Object is missing!";
exceptionMessages.MISSING_CONFIG_SECTION = "Config section %s missing!";
exceptionMessages.UNPARSABLE_CONFIG = "The config file %s was unparsable %s!";
exceptionMessages.CONFIG_REMOVED = "The Config setting: %s should be removed!";

// Validate our expected config
exports.configvalidation = function (config) {
  var cfg = config;
  assert('object' === typeof cfg, exceptionMessages.MISSING_CONFIG);

  assert.equal(true, cfg.fhmbaas.hasOwnProperty("port"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'port'));

  assert.equal(true, cfg.fhmbaas.hasOwnProperty("mongo"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'mongo'));
  assert.equal(true, cfg.fhmbaas.mongo.hasOwnProperty("enabled"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'enabled'));
  assert.equal(true, cfg.fhmbaas.mongo.hasOwnProperty("url"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'url'));

};
