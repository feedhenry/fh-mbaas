var mongo = require('../util/mongo.js');
var common = require('../util/common.js');
var logger = require('../util/logger').getLogger();
var config = require('fh-mbaas-middleware').config();
var ditchhelper = require('../util/ditchhelper.js');
var models = require('fh-mbaas-middleware');
var appEnv = require('../models/appEnv.js');
var validation = require('../util/validation.js');
var _ = require('underscore');
var fhconfig = require('fh-config');
var removeAppDB = require('../services/appmbaas/removeAppDb.js');

function getAppDbConf(appName, config) {
  var db_name = appName;
  var user = common.randomUser();
  var pass = common.randomPassword();
  //we do not save the db replicatSet name here just incase it could be changed

  var mongoConfig;

  if (mongo.hasUserSpaceDb()) {
    mongoConfig = config.mongo_userdb;
  } else {
    mongoConfig = config.mongo;
  }

  var db = {
    host: mongoConfig.host,
    port: mongoConfig.port,
    name: db_name,
    user: user,
    pass: pass
  };
  return db;
}

function getSecurityToken(req, res) {
  var key;
  try {
    key = validation.requireParam('securityToken', req, res);
  } catch (exception) {
    key = null;
  }
  return key;
}

function createDatabaseMigrationMiddleware(req, res, next) {
  var model = req.appMbaasModel;
  var securityToken = getSecurityToken(req, res);

  if (!_.isObject(model)) {
    return next(new Error("Invalid Parameters mbaas app not found"));
  }

  //Checking if the app has already been migrated
  if (model.migrated === true) {
    res.status(423);
    return next(new Error('Locked - Migration is already completed'));
  }

  var name = model.name;
  if (securityToken) {
    createDbForAppTypes(["feedhenry"])(req, res, next);
  } else {
    return next(new Error('No securityToken found for app ' + name));
  }
}

function createDbForAppTypes(types) {
  return function middleware(req, res, next) {
    var model = req.appMbaasModel;
    if (_.has(model.dbConf, "host")) {
      return next();
    }
    if (types && types.indexOf(model.type) < 0) {
      logger.info("not creating db for non openshift3 app ", req.appMbaasModel.type);
      return next();
    }
    var dbConfig = getAppDbConf(req.appMbaasModel.name, config);
    try {
      common.checkDbConf(dbConfig);
    } catch (e) {
      logger.error({ db: dbConfig }, 'db validation failed');
      return next(e);
    }
    model.dbConf = dbConfig;
    model.markModified('dbConf');
    logger.info({ app: model.name, db: dbConfig }, 'try to create database for app');

    var configClone = _.clone(config);

    if (mongo.hasUserSpaceDb()) {
      configClone.mongoUrl = config.mongoUserUrl;
      configClone.mongo = config.mongo_userdb;
    }

    mongo.createDb(configClone, dbConfig.user, dbConfig.pass, dbConfig.name, function (err) {
      if (err) {
        logger.error(err, 'Failed to create db : %s', dbConfig.name);
        return next(err);
      } else {
        logger.info(dbConfig, 'Database created');
        //Saving The Updated Db Conf
        model.save(function (err) {
          return next(err, dbConfig);
        });
      }
    });
  };
}

function stopAppMiddleware(req, res, next) {
  var model = req.appMbaasModel;

  if (!_.isObject(model)) {
    return next(new Error("Invalid Parameters mbaas app not found"));
  }
  var domain = model.domain;
  var env = model.environment;
  var name = model.name;

  logger.info({ app: name }, 'Stop app');

  var dfutils = dfutils = require('../util/dfutils.js');

  dfutils.stopApp(domain, env, name, function (err) {

    if (err) {
      return next(new Error('Failed to stop app ' + name, err));
    }
    logger.info({ app: name }, 'App stopped');
    return next();
  });
}

function notifyAppDbMigration(action) {
  return function (req, res, next) {
    var model = req.appMbaasModel;

    if (!_.isObject(model)) {
      return next(new Error("Invalid Parameters mbaas app not found"));
    }
    var domain = model.domain;
    var env = model.environment;
    var name = model.name;


    logger.info({ app: name }, 'migrateAppDb app');

    var dfutils = dfutils = require('../util/dfutils.js');

    dfutils.migrateAppDb(action, domain, env, name, function (err) {
      if (err) {
        // Don't abort the migration if the app state could not be set. If we do that the
        // user would see an error even though the app has already been migrated. Just log
        // the error and continue.
        logger.error({err: err}, 'Failed to update app state for ' + name);
      } else {
        logger.info({ app: name }, 'App set to migrate');
      }
      return next();
    });
  };
}

function migrateDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;

  if (!_.isObject(model)) {
    return next(new Error("Invalid Parameters mbaas app not found"));
  }
  var coreHost = req.body.coreHost;
  if (!coreHost) {
    return (new Error("Missing coreHost parater"));
  }
  var securityToken = getSecurityToken(req, res);
  var name = model.name;
  var domain = model.domain;
  var env = model.environment;
  var appGuid = model.guid;
  logger.info({ app: name }, 'Migrate App db');
  ditchhelper.doMigrate(domain, env, name, securityToken, appGuid, coreHost, function (err, result) {
    if (err) {
      return next(new Error('Error when try to migrate db for app  ' + name, err));
    }
    logger.info({ app: name }, 'App migrated ');
    req.createDbResult = result;
    next();
  });
}

function removeDbMiddleware(req, res, next) {
  var model = req.appMbaasModel;
  if (!_.isObject(model)) {
    logger.warn("Mbaas App Not Found", req.params);
    return next(new Error("Invalid Parameters mbaas app not found"));
  } else {

    var domain = model.domain;
    var env = model.environment;

    removeAppDB(mongo, domain, model, env, function complete(err, removed) {
      if (err) {
        return next(err);
      } else {
        req.resultData = removed;
        next();
      }
    });
  }
}

function modelsInfo(req, res, next) {
  var domain = req.params.domain;
  var env = req.params.environment;
  var model = req.appMbaasModel;
  var mBaas = models.mbaas();

  if (!model) {
    logger.warn("Mbaas App Not Found", req.params);
    return next(new Error("Invalid Parameters mbaas app not found"));
  }

  logger.debug({ name: model.name }, 'getting env vars for app', req.originalUrl);

  mBaas.findOne({ domain: domain, environment: env }, function (err, mbaas) {
    if (err) {
      logger.error(err, 'Failed to look up Mbaas/AppMbaas instance');
      return next(new Error('Failed to look up Mbaas/AppMbaas instance'));
    }
    var envs = appEnv[req.appMbaasModel.type]({
      mbaas: mbaas,
      appMbaas: model,
      fhconfig: fhconfig,
      jsonConfig: config
    });
    req.resultData = { env: envs };
    return next();
  });
}



module.exports = {
  createDbMiddleware: createDatabaseMigrationMiddleware,
  createDbForAppTypes: createDbForAppTypes,
  stopAppMiddleware: stopAppMiddleware,
  migrateDbMiddleware: migrateDbMiddleware,
  removeDbMiddleware: removeDbMiddleware,
  modelsInfo: modelsInfo,
  notifyAppDbMigration: notifyAppDbMigration
};
