var amqp = require('../util/amqp.js');
var supercoreApi = require("../util/supercoreApiClient");
var log = require('../util/logger');
var async = require('async');
var logger;

var models = require('fh-mbaas-middleware').models;
var dfutils = require('../util/dfutils.js');

function completeMigrateDbMiddleware(appMbaas, appInfo, cb) {
  var appName = appInfo.appName;
  async.series([
    function updateModel(callback) {
      if (appInfo.status === 'finished') {
        appMbaas.set('migrated', true);
        appMbaas.save(function(err) {
          if (err) {
            logger.error('Failed to save appMbaas', err);
          }
          return callback();
        });
      } else {
        return callback();
      }
    },
    function reloadEnv(callback) {
      logger.debug('Refresh app envs : ' + appMbaas.name);
      dfutils.reloadEnv(appMbaas.domain, appMbaas.environment, appMbaas.name, callback);
    },
    function stopAppDbMigrate(callback) {
      logger.debug('Set app to stopped: ' + appName);
      dfutils.migrateAppDb('stop', appMbaas.domain, appMbaas.environment, appMbaas.name, callback);
    }
  ], function(err) {
    if (err) {
      logger.error('[MIGRATION] failed to change app state', {app: appName, err: err});
      return cb(err);
    }
    logger.info('[MIGRATION] app state changed', {appName: appName});
    return cb();
  });
}

function migrationUpdate(json) {
  var appGuid = json.appGuid,
    env = json.env,
    domain = json.domain,
    appName = json.appName,
    status = json.status,
    securityToken = json.securityToken,
    messages = json.messages;
  logger.debug("Migration update received: ", json);
  var AppMbaasModel = models.getModels().AppMbaas;
  AppMbaasModel.findOne({
    name: appName
  }, function(err, appMbaas) {
    if (err) {
      return logger.error('Failed to lookup mbaasApp model with appName ' + appName);

    }
    if (!appMbaas) {
      return logger.error('No appMbaasModel found for app ' + appName);
    }
    async.parallel([
      function updateCore(callback) {
        var data = {
          securityToken: securityToken,
          domain: domain,
          env: env,
          appName: appName,
          appGuid: appGuid,
          messages: messages,
          status: status
        };
        var supercoreMessageType = "migrationStatus";
        supercoreApi.sendMessageToSupercore(appMbaas.coreHost, supercoreMessageType, data, callback);
      },
      function updateApp(callback) {
        if (status.toLowerCase() === 'finished' || status.toLowerCase() === 'failed') {
          var appInfo = {
            domain: domain,
            appName: appName,
            appGuid: appGuid,
            env: env,
            status: status
          };
          return completeMigrateDbMiddleware(appMbaas, appInfo, callback);
        } else {
          return callback();
        }
      }
    ], function(err) {
      if (err) {
        logger.error('Failed to do migrationUpdate', {error: err});
      }
    });
  });
}

/**
 * Listen to amqp migration status updates and publish it to supercore.
 *
 * @param conf - main configuration that contains amqp url
 * @param amqpConnection - connection to amqp queue - can be undefined when amqp is disabled
 */
function listenToMigrationStatus(amqpConnection, conf) {
  logger = log.getLogger();
  if (amqpConnection) {
    var exchangePrefix = amqp.getExchangePrefix(conf);
    //we need to namespace both the exchange and the queue to make sure fh-mbaas
    //will not receive messages that do not belong to the same mbaas
    var exchangeName = exchangePrefix + '-fh-internal';
    var queueName = 'fh-' + exchangePrefix + '-dbMigrationUpdate';
    logger.info("Subscribing to amqp queue", {exchangeName: exchangeName, queueName: queueName});
    amqpConnection.subscribeToTopic(exchangeName, queueName, 'fh.dbMigrate.#', migrationUpdate, function(err) {
      if (err) {
        logger.error("Cannot subscribe to amqp queue", {exchangeName: exchangeName, queueName: queueName, err: err});
      }
    });
  } else {
    logger.warn("Skipping amqp setup for migration status listerner");
  }
}

module.exports.listenToMigrationStatus = listenToMigrationStatus;
