var mbaas = require('../models.js');
var _ = require('underscore');
var fhconfig = require('fh-config');
var validation = require('../util/validation.js');
var logger = fhconfig.getLogger();


/**
 * Middleware To Find Or Create An Mbaas App
 * @param req
 * @param res
 * @param next
 */
function findOrCreateMbaasApp(req, res, next){

  logger.debug("findOrCreateMbaasApp ", req.params);

  var models = mbaas.getModels();

  //Checking For Required Params
  var missingParams = _.filter(["appGuid", "apiKey", "coreHost"], function(requiredKey){
    return validation.validateParamPresent(requiredKey, req);
  });

  if(missingParams.length > 0){
    logger.debug("findOrCreateMbaasApp Missing Param ", missingParams[0]);
    return validation.requireParam(missingParams[0], req, res);
  }

  findMbaasApp(req, res, function(err){
    if(err){
      logger.debug("Error Finding Mbaas App ", err);
      return next(err);
    }
    var appMbaas = req.appMbaasModel;

    //App Found, moving on.
    if(_.isObject(appMbaas)){
      logger.debug("Mbaas App Already Exists ");
      return next();
    }

    //App mbaas does not exist, create it.
    logger.debug("Mbaas App Does Not Exist, Creating New App Model ", {params: req.params, body: req.body});
    models.AppMbaas.createModel({
      name: req.params.appname,
      domain: req.params.domain,
      environment: req.params.environment,
      guid: req.body.appGuid,
      apiKey: req.body.apiKey,
      coreHost: req.body.coreHost,
      type: req.body.type,
      mbaasUrl: req.body.mbaasUrl
    }, function(err, createdMbaasApp){
      if(err){
        logger.debug("Error Creating New Mbaas App Model ", err);
        return next(err);
      }

      req.appMbaasModel = createdMbaasApp;
      next();
    });
  });
}

/**
 * Middleware For Finding An App
 * @param req
 * @param res
 * @param next
 */
function findMbaasApp(req, res, next){
  logger.debug("findMbaasApp for appname " + req.params.appname);
  getMbaasApp({
    name: req.params.appname
  }, function(err, appMbaas){
    if(err){
      logger.debug("findMbaasApp Error ", err);
      return next(err);
    }

    req.appMbaasModel = appMbaas;

    return next();
  });
}

//Function to get an mbaas app model.
function getMbaasApp(params, cb){
  var models = mbaas.getModels();
  models.AppMbaas.findOne(params, cb);
}

/**
 * Middleware To Update An Existing App Deployment
 * @param req
 * @param res
 * @param next
 */
function updateMbaasApp(req, res, next){
  var model = req.appMbaasModel;

  model.name = req.params.appname;
  model.domain = req.params.domain;
  model.environment = req.params.environment;
  model.guid = req.body.appGuid;
  model.apiKey = req.body.apiKey;
  model.coreHost = req.body.coreHost;
  model.type = req.body.type;
  model.mbaasUrl = req.body.mbaasUrl;

  model.save(next);
}

module.exports = {
  findOrCreateMbaasApp: findOrCreateMbaasApp,
  updateMbaasApp: updateMbaasApp,
  findMbaasApp: findMbaasApp,
  getMbaasApp: getMbaasApp
};