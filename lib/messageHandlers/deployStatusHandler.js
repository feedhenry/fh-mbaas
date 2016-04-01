var amqp = require('../util/amqp.js');
var supercoreApi = require("../util/supercoreApiClient");
var fhconfig = require('fh-config');
var async = require('async');
var logger;
var models = require('fh-mbaas-middleware').models;

function deployStatusUpdate(json){
  logger.debug("Deploy status recieved: ", json);
  if(!json || !json.appname){
    logger.error("Failed to send deploy status to supercore. appname variable missing", json);
    return;
  }
  var AppMbaasModel = models.getModels().AppMbaas;
  AppMbaasModel.findOne({
    name: json.appname
  }, function(err, appMbaas){
    if(err){
      return logger.error('Failed to lookup mbaasApp model with appName ' + json.appname);

    }
    if(!appMbaas){
      return logger.error('No appMbaasModel found for app ' + json.appname);
    }
    json.appGuid = appMbaas.guid;
    json.domain = appMbaas.domain;
    json.env = appMbaas.environment;
    var supercoreMessageType = "deployStatus";
    supercoreApi.sendMessageToSupercore(appMbaas.coreHost, supercoreMessageType, json, function(err){
      if(err){
        logger.error("Failed to send deploy status to supercore:", err, json);
      }
    });
  });
}

/**
 * Listen to amqp deploy status updates and publish it to supercore.
 *
 * @param conf - main configuration that contains amqp url
 */
function listenToDeployStatus(conf){
  logger = fhconfig.getLogger();
  if(conf.fhamqp && conf.fhamqp.enabled){
    amqp.connect(conf);
    var internalMsg = amqp.getVhostConnection(amqp.VHOSTS.INTERNAL);
    var exchangePrefix = amqp.getExchangePrefix(conf);
    //we need to namespace both the exchange and the queue to make sure fh-mbaas
    //will not receive messages that do not belong to the same mbaas
    var exchangeName = exchangePrefix + '-fh-internal';
    var queueName = 'fh-' + exchangePrefix + '-appDeployStatus';
    internalMsg.subscribeToTopic(exchangeName, queueName, 'fh.deployStatus.#', deployStatusUpdate, function(err){
      if(err){
        logger.error("Error received setting up subscriber" + err);
      }
    });
  }else{
    logger.warn("Database migration not enabled.");
  }
}

module.exports.listenToDeployStatus = listenToDeployStatus;
module.exports.deployStatusUpdate = deployStatusUpdate;
