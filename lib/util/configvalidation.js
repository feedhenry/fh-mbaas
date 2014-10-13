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

  assert.equal(true, cfg.hasOwnProperty("mongo"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'mongo'));
  assert.equal(true, cfg.mongo.hasOwnProperty("enabled"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'mongo.enabled'));
  assert.equal(true, cfg.mongo.hasOwnProperty("host"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'mongo.host'));
  assert.equal(true, cfg.mongo.hasOwnProperty("port"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'mongo.port'));
  assert.equal(true, cfg.mongo.hasOwnProperty("name"), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'mongo.name'));

  assert.equal(true, cfg.hasOwnProperty('fhditch'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhditch'));
  assert.equal(true, cfg.fhditch.hasOwnProperty('host'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhditch.host'));
  assert.equal(true, cfg.fhditch.hasOwnProperty('port'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhditch.port'));
  assert.equal(true, cfg.fhditch.hasOwnProperty('protocol'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhditch.protocol'));

  assert.equal(true, cfg.hasOwnProperty('fhdfc'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc'));
  assert.equal(true, cfg.fhdfc.hasOwnProperty('dynofarm'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc.dynofarm'));
  assert.equal(true, cfg.fhdfc.hasOwnProperty('username'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc.usrname'));
  assert.equal(true, cfg.fhdfc.hasOwnProperty('_password'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc._password'));
};
