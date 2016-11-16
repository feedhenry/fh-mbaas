'use strict';
var amqp = require('fh-amqp-js');
var fs = require('fs');
var _ = require('underscore');

/**
 * Connect to an AMQP message bus based on
 * the configuration provided
 * @param configuration
 * @param onReady a callback function will be invoked when the connection is ready.
 *        Note: this function will be invoked *EVERYTIME* the connection is established
 */
exports.connect = function(config, onReady) {
  var internalConnection;
  var logger = require('./logger').getLogger();
  if (!config || !config.fhamqp || !config.fhamqp.enabled) {
    logger.error("AMQP not enabled. Please check conf.json file.");
    return;
  }
  internalConnection = new amqp.AMQPManager(config.fhamqp.vhosts.internal);
  function error(err) {
    logger.error("error when connecting to amqp:" + err);
    throw new Error("amqp failed not continuing " + err);
  }
  function ready() {
    logger.info("connected to amqp ");
    if (onReady && _.isFunction(onReady)) {
      onReady();
    }
  }
  internalConnection.on('error', error);
  internalConnection.on('ready', ready);
  internalConnection.connectToCluster();
  return internalConnection;
};

exports.getExchangePrefix = function() {
  var fhconfig = require('fh-config');
  var logger = require('./logger').getLogger();

  var prefix = '';
  var ops_info_file_path = fhconfig.value('ops_env_file');
  if (fs.existsSync(ops_info_file_path)) {
    var ops_info = require(ops_info_file_path);
    if (ops_info && ops_info.env && ops_info.env.id) {
      prefix = ops_info.env.id;
    }
  } else {
    logger.error("Cannot find ops info file. ", {location: ops_info_file_path});
  }
  logger.warn('Connecting to amqp with prefix ' + prefix + '. ops file path ' + ops_info_file_path);
  return prefix;
};

exports.VHOSTS = {
  "INTERNAL":"internal"
};
