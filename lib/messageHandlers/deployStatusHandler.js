var amqp = require('../util/amqp.js');
var supercoreApi = require("../util/supercoreApiClient");
var logger;
var models = require('fh-mbaas-middleware').models;

function deployStatusUpdate(json) {
  logger.debug("Deploy status recieved: ", json);
  if (!json || !json.appname) {
    logger.error("Failed to send deploy status to supercore. appname variable missing", json);
    return;
  }
  var AppMbaasModel = models.getModels().AppMbaas;
  AppMbaasModel.findOne({
    name: json.appname
  }, function(err, appMbaas) {
    if (err) {
      return logger.error('Failed to lookup mbaasApp model with appName ' + json.appname);

    }
    if (!appMbaas) {
      return logger.error('No appMbaasModel found for app ' + json.appname);
    }
    json.appGuid = appMbaas.guid;
    json.domain = appMbaas.domain;
    json.env = appMbaas.environment;
    var supercoreMessageType = "deployStatus";
    supercoreApi.sendMessageToSupercore(appMbaas.coreHost, supercoreMessageType, json, function(err) {
      if (err) {
        logger.error("Failed to send deploy status to supercore:", err, json);
      }
    });
  });
}

/**
 * Listen to amqp deploy status updates and publish it to supercore.
 *
 * @param conf - main configuration that contains amqp url
 * @param amqpConnection - connection to amqp queue - can be undefined when amqp is disabled
 */
function listenToDeployStatus(amqpConnection, conf, callback) {
  logger = require('../util/logger').getLogger();
  if (amqpConnection) {
    var exchangePrefix = amqp.getExchangePrefix(conf);
    //we need to namespace both the exchange and the queue to make sure fh-mbaas
    //will not receive messages that do not belong to the same mbaas
    var exchangeName = exchangePrefix + '-fh-internal';
    var queueName = 'fh-' + exchangePrefix + '-appDeployStatus';
    logger.info("Subscribing to amqp queue", {exchangeName: exchangeName, queueName: queueName});
    amqpConnection.subscribeToTopic(exchangeName, queueName, 'fh.deployStatus.#', deployStatusUpdate, function(err) {
      if (err) {
        logger.error("Cannot subscribe to amqp queue", {exchangeName: exchangeName, queueName: queueName, err: err});
      }
      callback();
    });
  } else {
    logger.warn("Skipping amqp setup for deploy status listerner");
    callback();
  }
}

module.exports.listenToDeployStatus = listenToDeployStatus;
module.exports.deployStatusUpdate = deployStatusUpdate;
