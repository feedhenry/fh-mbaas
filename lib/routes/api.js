var express = require('express');
var fhconfig = require('fh-config');
//var logger = fhconfig.getLogger();
var common = require('../util/common');
var validation = require('../util/validation');
<<<<<<< HEAD
var appEnv = require('../models/appEnv');
var mbaas = require('../models.js');
var envMongoDb = require('../middleware/envMongoDb.js');
var auth = require('../middleware/auth.js');
var appMiddleware = require('../middleware/app.js');
=======
var async = require('async');
>>>>>>> 7726bd2... Modification for fhmbaas as service
var _ = require('underscore');

//var appEnv = require('../models/appEnv');
//var mbaas = require('../models.js');
//var envMongoDb = require('../middleware/envMongoDb.js');
//var auth = require('../middleware/auth.js');
//var appMiddleware = require('../middleware/app.js');

var fhmbaasMiddleware = require('fh-mbaas-middleware');

// TODO LMZ
var bunyan = require('bunyan');
var logger = bunyan.createLogger({name: 'fh-mbaas-middleware'});


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

router.use(fhmbaasMiddleware.auth.admin(fhconfig));

var models = fhmbaasMiddleware.models.getModels();

//to avoid race conditions, we will only set the db conf values on model creation. Since we have a unique composite index added for domain and environment, once the first record is created, the second creation will fail.
//then we will only create the mongdo db if the data creation is successful. If the mongo db creation is failed for whatever reason, we will delete the model.
router.post('/:domain/:environment/db', fhmbaasMiddleware.envMongoDb.getOrCreateEnvironmentDatabase, function(req, res) {
  return res.json({uri: req.mongoUrl});
});


router.post('/apps/:domain/:environment/:appname/migratedb', fhmbaasMiddleware.app.findOrCreateMbaasApp, function(req, res){
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

router.post('/apps/:domain/:environment/:appname/migrateComplete', fhmbaasMiddleware.app.findMbaasApp, function(req, res){
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
router['delete']('/apps/:domain/:environment/:appname', fhmbaasMiddleware.app.findMbaasApp, function(req, res){
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

router.get('/apps/:domain/:environment/:appname/env', fhmbaasMiddleware.app.findMbaasApp, function(req, res){
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

  models.Mbaas.findOne({domain: domain, environment: env}, function(err, mbaas){
    if(err){
      logger.error(err, 'Failed to look up Mbaas/AppMbaas instance');
    }
<<<<<<< HEAD
    var envs = appEnv[req.appMbaasModel.type]({
      mbaas: mbaas,
=======
    var envs = fhmbaasMiddleware.appEnv[req.appMbaasModel.type]({
      mbaas: results[0],
>>>>>>> 7726bd2... Modification for fhmbaas as service
      appMbaas: req.appMbaasModel,
      fhconfig: fhconfig
    });

    res.json({
      env: envs
    });
  });
});


//This route stores deployment information to fhmbaas
router.post('/apps/:domain/:environment/:appname/deploy', fhmbaasMiddleware.app.findOrCreateMbaasApp, fhmbaasMiddleware.app.updateMbaasApp, function(req, res){

  //Finished and no errors.
  res.json(req.appMbaasModel.toJSON());
});


//All Of The Routes Required For Forms Operations For Each Mbaas Environmnet
router.use('/:domain/:environment/appforms', require('./forms.js'));


/**
 * Error Handler For Admin API Requests
 *
 */
router.use(function(err, req, res, next){ // jshint unused:false
  common.handleError(err, 'Error when requesting url ' + req.originalUrl, 500, req, res);
});


module.exports = router;
