var mongo = require('../util/mongo.js');
var common = require('../util/common.js');
var logger = require('fh-config').getLogger();
var config = require('fh-mbaas-middleware').config();
var dfutils = require('../util/dfutils.js');
var ditchhelper = require('../util/ditchhelper.js');
var _ = require('underscore');


function createDbMiddleware(req, res, next){
  var model = req.appMbaasModel;
  createDb({config:config, model: model}, function(err, result){
    return next(err, result);
  });
}

function removeDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;
  removeDb({config:config, model: model}, function(err, result){
    return next(err, result);
  });
}


function stopAppMiddleware(req, res, next) {
  var model = req.appMbaasModel;
  stopApp({model:model},function(err, result) {
    return next(err, result);
  });
}

function migrateDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;
  var cacheKey = req.cacheKey;
  //var appGuid = model.guid;
  migrateDb({model:model, cacheKey:cacheKey} , function(err, result) {
    return next(err, result);
  });
}

function completeMigrateDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;
  //var appGuid = model.guid;
  //var name = model.name;
  var cacheKey = req.cacheKey;
  completeMigrateDb({cacheKey:cacheKey, model: model} , function(err, result) {
    return next(err, result);
  });
}

function dropDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;
  removeDb({config:config, model: model} , function(err, result) {
    return next(err, result);
  });
}
 
function createDb(params, cb){
  var config = params.config;
  var model = params.model;
  var name = model.name;

  if(model.migrated){
    return cb(new Error("Database Already Upgraded"));
  }

  if(_.has(model.dbConf, "host")){
    return cb(new Error("Database Already Created"));
  }

  //Creating A New Database Config For The App.
  var dbConfig = getAppDbConf(name, config);
  model.dbConf = dbConfig;
  //model.markModified('dbConf');
  logger.info({app: name, db: dbConfig}, 'try to create database for app');
  try{
    common.checkDbConf(dbConfig);
  }catch(e){
    logger.info({db:dbConfig}, 'db validation failed');
    return cb(e);
  }

  mongo.createDb(config, dbConfig.user, dbConfig.pass, dbConfig.name, function(err){
    if(err){
      logger.error(err, 'Failed to create db : %s', dbConfig.name);
      return cb(err);
    } else {
      logger.info(dbConfig, 'Database created');

      //Saving The Updated Db Conf
      model.save(function(err){
        return cb(err, dbConfig);
      });
    }
  });
}

function removeDb(params, cb){
  var model = params.model;
  var name = model.name;
  var config = params.config;
  logger.info({app: name}, 'remove db for app');

  //If the app was never migrated, the per-app database will never have existed.
  if(!model.migrated){
    return cb();
  }

  mongo.dropDb(config, model.dbConf.user, model.dbConf.name, function(err){
    if(err) return cb(err);
    logger.trace({app:name}, 'app db is dropped');
    return cb();
  });
}

function stopApp(params,cb){
  var model = params.model;
  var domain = model.domain;
  var env = model.environment;
  var name = model.name;
  logger.info({app: name}, 'Stop app');
  dfutils.stopApp(domain, env, name, function(err){
    if(err) return cb(err);
    logger.info({app: name}, 'App stopped');
    return cb();
  });
}

function migrateDb(params, cb){
  var model = params.model;
  var name = model.name;
  var domain = model.domain;
  var env = model.environment;
  var cacheKey = params.cacheKey;
  var appGuid = model.guid;
  logger.info({app: name}, 'Migrate App db');
  ditchhelper.doMigrate(domain, env, name, cacheKey, appGuid, cb);
}

function completeMigrateDb(params, cb){
  var model = params.model;
  var domain = model.domain;
  var env = model.environment;
  var name = model.name;
  var cacheKey = params.cacheKey;
  var appGuid = model.appGuid;

  model.migrated = true;
  logger.info({app:name}, 'Complete app db migration');
  model.save(function(err){
    if(err) return cb(err);
    ditchhelper.migrateComplete(domain, env, name, cacheKey, appGuid, function(){
      //don't care about errors
      cb();
    });
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


module.exports = {
  createDbMiddleware: createDbMiddleware,
  stopAppMiddleware: stopAppMiddleware,
  migrateDbMiddleware: migrateDbMiddleware,
  completeMigrateDbMiddleware: completeMigrateDbMiddleware,
  removeDbMiddleware: removeDbMiddleware,
  dropDbMiddleware: dropDbMiddleware
};
