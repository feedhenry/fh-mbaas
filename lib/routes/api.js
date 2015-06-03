var express = require('express');
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var common = require('../util/common');
var validation = require('../util/validation');
var appEnv = require('../models/appEnv');
var async = require('async');
var mbaas = require('../models.js');
var envMongoDb = require('../middleware/envMongoDb.js');
var auth = require('../middleware/auth.js');
var appMiddleware = require('../middleware/app.js');
var _ = require('underscore');


function handleAppMbaasError(appmbaas, err, message, req, res){
  return appmbaas.remove(function(removeErr){
    if(removeErr){
      logger.error(removeErr, 'Failed to remove app mbaas instance : ' + appmbaas.name);
    }
    return common.handleError(err, message, 500, req, res);
  });
}

var router = new express.Router({
  mergeParams: true
});

router.use(auth.admin(fhconfig));

var models = mbaas.getModels();

//to avoid race conditions, we will only set the db conf values on model creation. Since we have a unique composite index added for domain and environment, once the first record is created, the second creation will fail.
//then we will only create the mongdo db if the data creation is successful. If the mongo db creation is failed for whatever reason, we will delete the model.
router.post('/:domain/:environment/db', envMongoDb.getOrCreateEnvironmentDatabase, function(req, res) {
  return res.json({uri: req.mongoUrl});
});


router.post('/apps/:domain/:environment/:appname/migratedb', appMiddleware.findOrCreateMbaasApp, function(req, res){
  var appname = req.params.appname;
  var appMbaasModel = req.appMbaasModel;

  var cacheKey = validation.requireParam('cacheKey', req, res);

  //Checking if the app has already been migrated
  if(appMbaasModel.isDbMigrated()){
    return common.handleError(new Error('locked'), 'Migration is already completed', 423, req, res);
  }

  //Checking if the app has already been migrated
  if(appMbaasModel.isAppDbCreated()){
    return common.handleError(new Error('locked'), 'Migration is already started', 423, req, res);
  }

  //Performing Migration.
  if(cacheKey){
    appMbaasModel.createDb(fhconfig, function(err){
      if(err) return handleAppMbaasError(appMbaasModel, err, 'Failed to create db for app ' + appname, req, res);
      appMbaasModel.stopApp(function(err){
        if(err) return handleAppMbaasError(appMbaasModel, err, 'Failed to stop app ' + appname, req, res);
        appMbaasModel.migrateDb(cacheKey, appMbaasModel.guid, function(err, data){
          if(err) return handleAppMbaasError(appMbaasModel, err, 'Error when try to migrate db for app ' + appname, req, res);
          return res.json(data);
        });
      });
    });
  }
});

router.post('/apps/:domain/:environment/:appname/migrateComplete', appMiddleware.findMbaasApp, function(req, res){
  var domain = req.params.domain;
  var env = req.params.environment;
  var appname = req.params.appname;

  var cacheKey = validation.requireParam('cacheKey', req, res);

  if(!_.isObject(req.appMbaasModel)){
    return common.handleError(new Error("Invalid Parameters"), 'mbaas app not found', 500, req, res);
  }

  if(cacheKey){
    logger.debug({domain: domain, env: env, appname: appname}, 'process db migrate complete request');
    req.appMbaasModel.completeMigrate(cacheKey, req.appMbaasModel.guid, function(err, data){
      if(err){
        return common.handleError(err, 'failed to complete app db migration', 500, req, res);
      }
      return res.json(data);
    });
  }
});

//Deleting The App From The MbaaS.
router['delete']('/apps/:domain/:environment/:appname', appMiddleware.findMbaasApp, function(req, res){
  var domain = req.params.domain;
  var env = req.params.environment;
  var appname = req.params.appname;

  logger.debug({domain: domain, env: env, appname: appname}, 'process app db delete request');
  var mbaasModel = req.appMbaasModel;
  if(!mbaasModel){
    //no record found, nothing to do
    return res.json({});
  } else {
    mbaasModel.removeDb(fhconfig, function(err){
      if(err){
        return common.handleError(err, 'Error when remove db for app ' + appname, 500, req, res);
      }
      //db is remove, remove the data entry itself
      mbaasModel.remove(function(err, removed){
        if(err){
          return common.handleError(err, 'Error when remove app mbaas instance ' + appname, 500, req, res);
        }
        return res.json(removed);
      });
    });
  }
});

router.get('/apps/:domain/:environment/:appname/env', appMiddleware.findMbaasApp, function(req, res){
  var domain = req.params.domain;
  var env = req.params.environment;
  var appname = req.params.appname;

  logger.debug({appname: appname}, 'getting env vars for app', req.originalUrl);

  //There should always be an app mbaas entry for deployed apps as access keys are required.
  if(!_.isObject(req.appMbaasModel)){
    var err = new Error("No App Mbaas Config Was Found");
    logger.error(err, 'Failed to look up Mbaas/AppMbaas instance');
    return common.handleError(err, 'Error when getting env vars for app ' + appname, 500, req, res);
  }

  async.parallel([
    function(callback){
      models.Mbaas.findOne({domain: domain, environment: env}, callback);
    }
  ], function(err, results){
    if(err){
      logger.error(err, 'Failed to look up Mbaas/AppMbaas instance');
    }
    var envs = appEnv[req.appMbaasModel.type]({
      mbaas: results[0],
      appMbaas: req.appMbaasModel,
      fhconfig: fhconfig
    });

    res.json({
      env: envs
    });
  });
});


//This route stores deployment information to fhmbaas
router.post('/apps/:domain/:environment/:appname/deploy', appMiddleware.findOrCreateMbaasApp, appMiddleware.updateMbaasApp, function(req, res){

  //Finished and no errors.
  res.json(req.appMbaasModel.toJSON());
});

//All Of The Routes Required For Forms Operations For Each Mbaas Environmnet
router.use('/:domain/:environment/appforms', require('./forms.js'));


/**
 * Error Handler For Admin API Requests
 */
router.use(function(err, req, res, next){
  common.handleError(err, 'Error when requesting url ' + req.originalUrl, 500, req, res);
});


module.exports = router;