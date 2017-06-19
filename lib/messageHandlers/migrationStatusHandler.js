var supercoreApi = require("../util/supercoreApiClient");
var logger = require('../util/logger').getLogger();
var async = require('async');

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

function migrationUpdate(json, cb) {
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

      return cb();
    });
  });
}

module.exports.migrationUpdate = migrationUpdate;
