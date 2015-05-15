//Function for getting the mongo connection URI for a specific environment.

var mbaas = require('../models.js');
var common = require('../util/common.js');
var fhconfig = require('fh-config');


/**
 * Function that will return a mongo
 * @param req
 * @param res
 * @param next
 */
function getOrCreateEnvironmentDatabase(req, res, next){
  var logger = fhconfig.getLogger();
  var models = mbaas.getModels();

  logger.debug('process getOrCreateEnvironmentDatabase request', req.originalUrl , req.body, req.method, req.params);

  var domain = req.params.domain;
  var env = req.params.environment;
  logger.debug('process db create request', {domain: domain, env: env} );

  _getEnvironmentDatabase({
    domain: domain,
    environment: env
  }, function(err, found){
    if(err){
      return next(common.buildErrorObject({
        err: err,
        msg: 'Failed to get mbaas instance',
        httpCode: 500
      }));
    }
    if(found){
      req.mongoUrl = common.formatDbUri(found.dbConf);
      return next();
    } else {
      //because of the composite unique index on the collection, only the first creation call will success.
      models.Mbaas.createModel(domain, env, fhconfig, function(err, created){
        if(err){
          return next(common.buildErrorObject({
            err: err,
            msg: 'Failed to create mbaas instance',
            httpCode: 500
          }));
        }
        created.createDb(fhconfig, function(err, dbConf){
          if(err){
            logger.error('Failed to create db, delete model');
            created.remove(function(removeErr){
              if(removeErr){
                logger.error(removeErr, 'Failed to remove model');
              }
              return next(common.buildErrorObject({
                err: err,
                msg: 'Failed to create db for domain ' + domain + ' and env ' + env,
                httpCode: 500
              }));
            });
          } else {
            req.mongoUrl = common.formatDbUri(dbConf);
            next();
          }
        });
      });
    }
  });
}

function _getEnvironmentDatabase(params, cb){
  var logger = fhconfig.getLogger();
  var models = mbaas.getModels();

  logger.debug('process _getEnvironmentDatabase request', params );

  models.Mbaas.findOne(params, cb);
}

//Middleware To Get An Environment Database
function getEnvironmentDatabase(req, res, next){
  var logger = fhconfig.getLogger();

  logger.debug('process getEnvironmentDatabase request', req.originalUrl );

  _getEnvironmentDatabase({
    domain: req.params.domain,
    environment: req.params.environment
  }, function(err, envDb){
    if(err){
      logger.error('Failed to get mbaas instance', err);
      return next(common.buildErrorObject({
        err: err,
        msg: 'Failed to get mbaas instance',
        httpCode: 500
      }));
    }

    if(!envDb){
      logger.error("No Environment Database Found", err);
      return next(common.buildErrorObject({
        err: new Error("No Environment Database Found"),
        httpCode: 400
      }));
    }

    req.mongoUrl = common.formatDbUri(envDb.dbConf);

    logger.debug("Found Environment Database", req.mongoUrl);

    return next();
  });
}

module.exports = {
  getOrCreateEnvironmentDatabase: getOrCreateEnvironmentDatabase,
  getEnvironmentDatabase: getEnvironmentDatabase
};