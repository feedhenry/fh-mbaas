var express = require('express');
var common = require('../util/common');
var validation = require('../util/validation');
var async = require('async');
var _ = require('underscore');
var logger = require('fh-config').getLogger();
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var fhconfig = require('fh-config');
var auth = require('../middleware/auth.js');
var middleware = require('../middleware/mbaasApp.js');
var appEnv = require('../models/appEnv.js');

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

//fhmbaasMiddleware.init(fhconfig);

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
  if(appMbaasModel.migrated){
    return common.handleError(new Error('locked'), 'Migration is already completed', 423, req, res);
  }

  //Checking if the app has already been migrated
  if(_.has(appMbaasModel.dbConf,"host")){
    return common.handleError(new Error('locked'), 'Migration is already started', 423, req, res);
  }

  //Performing Migration.
  if(cacheKey){
    middleware.createDbMiddleware(req, res, function(err,result) {
      if(err) return handleAppMbaasError(appMbaasModel, err, 'Failed to create db for app ' + appname, req, res);
      middleware.stopAppMiddleware(req, res, function(err, result){
        if(err) return handleAppMbaasError(appMbaasModel, err, 'Failed to stop app ' + appname, req, res);
        middleware.migrateDbMiddleware(req, res, function(err, data){
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
    //req.appMbaasModel.completeMigrate(cacheKey, req.appMbaasModel.guid, function(err, data){
    middleware.completeMigrateDbMiddleware(req, res, function(err, data){
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
    middleware.dropDbMiddleware(req, res, function(err){
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
    var envs = fhmbaasMiddleware.appEnv[req.appMbaasModel.type]({
      mbaas: mbaas,
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
