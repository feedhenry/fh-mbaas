var mongo = require('../util/mongo.js');
var common = require('../util/common.js');
var logger = require('fh-config').getLogger();
var config = require('fh-mbaas-middleware').config();
var ditchhelper = require('../util/ditchhelper.js');
var models = require('fh-mbaas-middleware');
var appEnv = require('../models/appEnv.js');
var validation = require('../util/validation.js');
var _ = require('underscore');
var fhconfig = require('fh-config');

function createDbMiddleware(req, res, next){
  var model = req.appMbaasModel;
  var cacheKey = getCacheKey(req,res);

  if(!_.isObject(model)){
    return next(new Error("Invalid Parameters mbaas app not found"));
  }

  //Checking if the app has already been migrated
  if(model.migrated === true){
    res.status(423);
    return next(new Error('Locked - Migration is already completed'));
  }

  //Checking if the app has already been migrated
  if(_.has(model.dbConf,"host")){
    res.status(423);
    return next(new Error('Locked - Migration is already started'));
  }

  //Performing Migration.
  var name = model.name;
  if(cacheKey){
    var dbConfig = getAppDbConf(name, config);
    model.dbConf = dbConfig;
    model.markModified('dbConf');
    logger.info({app: name, db: dbConfig}, 'try to create database for app');
    try{
      common.checkDbConf(dbConfig);
    } catch(e) {
      logger.info({db:dbConfig}, 'db validation failed');
      return next(e);
    }
    mongo.createDb(config, dbConfig.user, dbConfig.pass, dbConfig.name, function(err){
      if(err){
        logger.error(err, 'Failed to create db : %s', dbConfig.name);
        return next(err);
      } else {
        logger.info(dbConfig, 'Database created');

        //Saving The Updated Db Conf
        model.save(function(err){
          return next(err, dbConfig);
        });
      }
    });
  }
  else {
    return next(new Error('No cacheKey found for app ' + name));
  }
}

function stopAppMiddleware(req, res, next) {
  var model = req.appMbaasModel;

  if(!_.isObject(model)){
    return next(new Error("Invalid Parameters mbaas app not found"));
  }
  var domain = model.domain;
  var env = model.environment;
  var name = model.name;


  logger.info({app: name}, 'Stop app');

  var dfutils;
  try {
    dfutils = require('../util/dfutils.js');
  } catch(e) {
    logger.warn("fh-dfc is probably missing. It's not necessary for Openshift targets.");
    logger.warn(e);
  }

  if (!dfutils) {
    return next();
  }

  dfutils.stopApp(domain, env, name, function(err){

    if(err){
      return next(new Error('Failed to stop app ' + name,err));
    }
    logger.info({app: name}, 'App stopped');
    return next();
  });
}

function notifyAppDbMigration(action){
  return function(req, res, next){
    var model = req.appMbaasModel;

    if(!_.isObject(model)){
      return next(new Error("Invalid Parameters mbaas app not found"));
    }
    var domain = model.domain;
    var env = model.environment;
    var name = model.name;


    logger.info({app: name}, 'migrateAppDb app');

    var dfutils;
    try {
      dfutils = require('../util/dfutils.js');
    } catch(e) {
      logger.warn("fh-dfc is probably missing. It's not necessary for Openshift targets.");
      logger.warn(e);
    }

    if (!dfutils) {
      return next();
    }

    dfutils.migrateAppDb(action, domain, env, name, function(err){

      if(err){
        return next(new Error('Failed to set app to migrate ' + name,err));
      }
      logger.info({app: name}, 'App set to migrate');
      return next();
    });
  };
}

function checkMigrateDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;

  if(!_.isObject(model)){
    logger.error("Mbaas App Not Found", req.params);
    return next(new Error("Invalid Parameters mbaas app not found"));
  }

  var cacheKey = req.body && req.body.cacheKey || null;
  var name = model.name;
  var domain = model.domain;
  var env = model.environment;
  var appGuid = model.guid;

  logger.info({app: name}, 'Checking Status of Migrate App db');
  ditchhelper.checkMigrateStatus(domain, env, name, cacheKey, appGuid, function(err,result) {
    if(err) {
      return next(new Error('Error when try to check status of migrate db for app  ' + name,err));
    }

    logger.info({app: name}, 'Migrate Status Checked with result ', result);

    req.checkDbMigrateResult = result;
    next();
  });
}

function migrateDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;

  if(!_.isObject(model)){
    return (new Error("Invalid Parameters mbaas app not found"));
  }

  var cacheKey = getCacheKey(req,res);
  var name = model.name;
  var domain = model.domain;
  var env = model.environment;
  var appGuid = model.guid;

  logger.info({app: name}, 'Migrate App db');
  ditchhelper.doMigrate(domain, env, name, cacheKey, appGuid, function(err,result) {
    if(err) return next(new Error('Error when try to migrate db for app  ' + name,err));
    logger.info({app: name}, 'App migrated ');
    req.createDbResult = result;
    next();
  });
}

function completeMigrateDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;

  if(!_.isObject(model)){
    logger.warn("Mbaas App Not Found", req.params);
    return next(new Error("Invalid Parameters mbaas app not found"));
  }

  var name = model.name;
  var cacheKey = getCacheKey(req,res);

  if(cacheKey){
    model.migrated = true;
    logger.info({app:name}, 'Complete app db migration');
    model.save(function(err){
      if(err){
        return next(err);
      }
      logger.info({app: name}, 'App migration completed ');
      next();
    });
  } else {
    return next(new Error('No cacheKey found for app ' + name));
  }
}

function removeDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;

  if(!_.isObject(model)){

    logger.warn("Mbaas App Not Found", req.params);
    return next(new Error("Invalid Parameters mbaas app not found"));
  } else {

    var domain = model.domain;
    var env = model.environment;
    var name = model.name;
    logger.debug({domain: domain, env: env, name: name}, 'process app db delete request');

    //If the app was never migrated, the per-app database will never have existed.
    if(!model.migrated){
      return next();
    }

    mongo.dropDb(config, model.dbConf.user, model.dbConf.name, function(err){
      if(err) return next(new Error('Request to remove db for app ' + name,err));
      logger.trace({app:name}, 'app db is dropped');
      //db is remove, remove the data entry itself
      model.remove(function(err, removed){
        if(err){
          return next(new Error('Removing app mbaas instance ' + name, err));
        }
        else {
          req.resultData = removed;
          next();
        }
      });
    });
  }
}

function modelsInfo(req, res, next) {
  var domain = req.params.domain;
  var env = req.params.environment;
  var model = req.appMbaasModel;
  var mBaas = models.mbaas();

  logger.debug({name: model.name}, 'getting env vars for app', req.originalUrl);

  mBaas.findOne({domain: domain, environment: env}, function(err, mbaas){
    if(err){
      logger.error(err, 'Failed to look up Mbaas/AppMbaas instance');
      return next(new Error('Failed to look up Mbaas/AppMbaas instance'));
    }
    var envs = appEnv[req.appMbaasModel.type]({
      mbaas: mbaas,
      appMbaas: model,
      fhconfig: fhconfig,
      jsonConfig: config
    });
    req.resultData = {env:envs};
    return next();
  });
}

function getAppDbConf(appName, config){
  var db_name = appName;
  var user = common.randomUser();
  var pass = common.randomPassword();
  var db = {
    host: config.mongo.host,
    port: config.mongo.port,
    name: db_name,
    user: user,
    pass: pass
  };
  return db;
}

function getCacheKey(req,res) {
  var key;
  try {
    key = validation.requireParam('cacheKey',req,res);
  }
  catch(exception) {
    key = null;
  }
  return key;
}

module.exports = {
  createDbMiddleware: createDbMiddleware,
  stopAppMiddleware: stopAppMiddleware,
  migrateDbMiddleware: migrateDbMiddleware,
  checkMigrateDbMiddleware: checkMigrateDbMiddleware,
  completeMigrateDbMiddleware: completeMigrateDbMiddleware,
  removeDbMiddleware: removeDbMiddleware,
  modelsInfo: modelsInfo,
  notifyAppDbMigration: notifyAppDbMigration
};
