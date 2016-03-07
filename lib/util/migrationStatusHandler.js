var amqp = require('./amqp.js');
var supercoreApi = require("./supercore-api");
var fhconfig = require('fh-config');
var async = require('async');
var logger;

var models = require('fh-mbaas-middleware').models;
var dfutils = require('./dfutils.js');


function completeMigrateDbMiddleware(appInfo, cb){
  var appName = appInfo.appName;
  var AppMbaasModel = models.getModels().AppMbaas;
  AppMbaasModel.findOne({
    name: appName
  }, function(err, appMbaas){
    if(err){
      logger.error('Failed to lookup mbaasApp model with appName ' + appName);
      return cb(err);
    }
    if(!appMbaas){
      logger.error('No appMbaasModel found for app ' + appName);
      return cb('no_appmbaas');
    }

    async.series([
      function updateModel(callback){
        if(appInfo.status === 'finished'){
          appMbaas.set('migrated', true);
          appMbaas.save(function(err){
            if(err){
              logger.error('Failed to save appMbaas', err);
            }
            return callback();
          });
        } else {
          return callback();
        }
      },
      function reloadEnv(callback){
        logger.info('Refresh app envs : ' + appMbaas.name);
        dfutils.reloadEnv(appMbaas.domain, appMbaas.environment, appMbaas.name, callback);
      },
      function stopAppDbMigrate(callback){
        logger.info('Set app to stopped: ' + appName);
        dfutils.migrateAppDb('stop', appMbaas.domain, appMbaas.environment, appMbaas.name, callback);
      }
    ], function(err){
      if(err){
        logger.error('[MIGRATION] failed to change app state', {app: appName, err: err});
        return cb(err);
      }
      logger.info('[MIGRATION] app state changed', {appName: appName});
      return cb();
    });
  });
}

function migrationUpdate(json){
  var appGuid = json.appGuid,
    env = json.env,
    domain = json.domain,
    appName = json.appName,
    status = json.status;

  logger.info("Migration update recieved: ", json);
  async.parallel([
    function updateCore(callback){
      supercoreApi.pushStatus(json, callback);
    },
    function updateApp(callback){
      if(status.toLowerCase() === 'finished' || status.toLowerCase() === 'failed'){
        var appInfo = {
          domain: domain,
          appName: appName,
          appGuid: appGuid,
          env: env,
          status : status
        };
        return completeMigrateDbMiddleware(appInfo, callback);
      } else {
        return callback();
      }
    }
  ], function(err){
    if(err){
      logger.error('Failed to do migrationUpdate', {error: err});
    }
  });
}

/**
 * Listen to amqp status updates
 * @param conf - main conf file that contains amqp url
 */
function listenToMigrationStatus(conf){
  if(conf.fhamqp){
    logger = fhconfig.getLogger();
    amqp.connect(conf);
    var internalMsg = amqp.getVhostConnection(amqp.VHOSTS.INTERNAL);
    internalMsg.subscribeToTopic("fh-internal", "dbMigrationUpdate", 'fh.dbMigrate.#', migrationUpdate, function(err){
      if(err){
        logger.error("Error received setting up subscriber" + err);
      }
    });
  }
}


module.exports.listenToMigrationStatus = listenToMigrationStatus;
