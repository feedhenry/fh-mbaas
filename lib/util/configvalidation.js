var assert = require('assert');
var util = require('util');
var exceptionMessages = {};

exceptionMessages.MISSING_CONFIG = "The Config file %s or Object is missing!";
exceptionMessages.MISSING_CONFIG_SECTION = "Config section %s missing!";
exceptionMessages.UNPARSABLE_CONFIG = "The config file %s was unparsable %s!";
exceptionMessages.CONFIG_REMOVED = "The Config setting: %s should be removed!";

// Validate our expected config
exports.configvalidation = function(config) {
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
  assert.equal(true, cfg.fhdfc.hasOwnProperty('username'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc.username'));
  assert.equal(true, cfg.fhdfc.hasOwnProperty('_password'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc._password'));
  assert.equal(true, cfg.fhdfc.hasOwnProperty('loglevel'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc.loglevel'));
  assert.equal(true, cfg.fhdfc.hasOwnProperty('cache_timeout'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhdfc.cache_timeout'));

  assert.equal(true, cfg.hasOwnProperty('fhamqp'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp'));
  assert.equal(true, cfg.fhamqp.hasOwnProperty('enabled'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.enabled'));
  assert.equal(true, cfg.fhamqp.hasOwnProperty('max_connection_retry'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.max_connection_retry'));
  assert.equal(true, cfg.fhamqp.hasOwnProperty('ssl'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.ssl'));
  assert.equal(true, cfg.fhamqp.hasOwnProperty('vhosts'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.vhosts'));
  assert.equal(true, cfg.fhamqp.vhosts.hasOwnProperty('events'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.vhosts.events'));
  assert.equal(true, cfg.fhamqp.vhosts.events.hasOwnProperty('clusterNodes'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.vhosts.events.name'));

  assert.equal(true, cfg.fhamqp.vhosts.hasOwnProperty('internal'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.vhosts.events'));
  assert.equal(true, cfg.fhamqp.vhosts.internal.hasOwnProperty('clusterNodes'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.vhosts.internal.name'));
  assert.equal(true, cfg.fhamqp.hasOwnProperty('app'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.app'));
  assert.equal(true, cfg.fhamqp.app.hasOwnProperty('enabled'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhamqp.app.enabled'));

  assert.equal(true, cfg.hasOwnProperty('fhmessaging'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('enabled'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.enabled'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('host'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.host'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('protocol'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.protocol'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('port'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.port'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('path'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.path'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('cluster'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.cluster'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('realtime'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.realtime'));
  assert.equal(true, cfg.fhmessaging.hasOwnProperty('files'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.files'));
  assert.equal(true, cfg.fhmessaging.files.hasOwnProperty('recovery_file'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.files.recovery_file'));
  assert.equal(true, cfg.fhmessaging.files.hasOwnProperty('backup_file'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhmessaging.files.backup_file'));

  assert.equal(true, cfg.hasOwnProperty('fhstats'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhstats'));
  assert.equal(true, cfg.fhstats.hasOwnProperty('enabled'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhstats.enabled'));
  assert.equal(true, cfg.fhstats.hasOwnProperty('host'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhstats.host'));
  assert.equal(true, cfg.fhstats.hasOwnProperty('port'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhstats.port'));
  assert.equal(true, cfg.fhstats.hasOwnProperty('protocol'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhstats.protocol'));


  assert.equal(true, cfg.hasOwnProperty('fhredis'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhredis'));
  assert.equal(true, cfg.fhredis.hasOwnProperty('host'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhredis.host'));
  assert.equal(true, cfg.fhredis.hasOwnProperty('port'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhredis.port'));
  assert.equal(true, cfg.fhredis.hasOwnProperty('password'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'fhredis.password'));


  assert.equal(true, cfg.hasOwnProperty('crash_monitor'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'crash_monitor'));
  assert.equal(true, cfg.crash_monitor.hasOwnProperty('min_num_crashes'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'crash_monitor.min_num_crashes'));
  assert.equal(true, cfg.crash_monitor.hasOwnProperty('tolerance'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'crash_monitor.tolerance'));
  assert.equal(true, cfg.crash_monitor.hasOwnProperty('base_time_seconds'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'crash_monitor.base_time_seconds'));
  assert.equal(true, cfg.crash_monitor.hasOwnProperty('sample_time_hrs'), util.format(exceptionMessages.MISSING_CONFIG_SECTION, 'crash_monitor.sample_time_hrs'));
};
