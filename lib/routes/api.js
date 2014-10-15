var express = require('express');
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var common = require('../util/common');
var appEnv = require('../models/appEnv');
var async = require('async');

function requireParam(name, req, res){
  var param = req.body[name];
  if(!param || param.lengh <=0 ){
    common.handleError(new Error('Missing param ' + name), 'Missing param ' + name, 400, req, res);
    return null;
  }
  return param;
}

function handleAppMbaasError(appmbaas, err, message, req, res){
  return appmbaas.remove(function(removeErr){
    if(removeErr){
      logger.error(removeErr, 'Failed to remove app mbaas instance : ' + appmbaas.name);
    }
    return common.handleError(err, message, 500, req, res);
  });
}

function dbRoutes(mbaas) {
  var router = new express.Router();
  var models = mbaas.models;

  //to avoid race conditions, we will only set the db conf values on model creation. Since we have a unique composite index added for domain and environment, once the first record is created, the second creation will fail.
  //then we will only create the mongdo db if the data creation is successful. If the mongo db creation is failed for whatever reason, we will delete the model. 
  router.post('/:domain/:environment/db', function(req, res) {
    var domain = req.params.domain;
    var env = req.params.environment;
    logger.debug({domain: domain, env: env}, 'process db create request');
    models.Mbaas.findOne({domain: domain, environment: env}, function(err, found){
      if(err){
        return common.handleError(err, 'Failed to get mbaas instance', 500, req, res);
      }
      if(found){
        return res.json({uri: common.formatDbUri(found.dbConf)});
      } else {
        //because of the composite unique index on the collection, only the first creation call will success.
        models.Mbaas.createModel(domain, env, fhconfig, function(err, created){
          if(err){
            return common.handleError(err, 'Failed to create mbaas instance', 500, req, res);
          }
          created.createDb(fhconfig, function(err, dbConf){
            if(err){
              logger.error('Failed to create db, delete model');
              created.remove(function(removeErr){
                if(removeErr){
                  logger.error(removeErr, 'Failed to remove model');
                }
                return common.handleError(err, 'Failed to create db for domain ' + domain + ' and env ' + env, 500, req, res);
              });
            } else {
              return res.json({uri: common.formatDbUri(dbConf)});
            }
          });
        });
      }
    });
  });

  router.post('/apps/:domain/:environment/:appname/migratedb', function(req, res){
    var domain = req.params.domain;
    var env = req.params.environment;
    var appname = req.params.appname;

    var cacheKey = requireParam('cacheKey', req, res);
    var appGuid = requireParam('appGuid', req, res);

    if(cacheKey && appGuid){
      logger.debug({domain: domain, env: env, appname: appname}, 'process app db migrate request');
      models.AppMbaas.findOne({
        name: appname
      }, function(err, appmbaas){
        if(err){
          return common.handleError(err, 'Failed to get app mbaas instance', 500, req, res);
        }
        if(appmbaas){
          //once the record is created, we will not proceed anymore to prevent race conditions
          logger.info('found app mbaas instance for ' + appname);
          return common.handleError(new Error('locked'), 'Migration is already started or completed', 423, req, res);
        } else {
          models.AppMbaas.createModel(appname, domain, env, fhconfig, function(err, created){
            if(err){
              return common.handleError(err, 'Failed to create app mbaas instance', 500, req, res);
            } else {
              created.createDb(fhconfig, function(err){
                if(err) return handleAppMbaasError(created, err, 'Failed to create db for app ' + appname, req, res);
                created.stopApp(function(err){
                  if(err) return handleAppMbaasError(created, err, 'Failed to stop app ' + appname, req, res);
                  created.migrateDb(cacheKey, appGuid, function(err, data){
                    if(err) return handleAppMbaasError(created, err, 'Error when try to migrate db for app ' + appname, req, res);
                    return res.json(data);
                  });
                });
              });
            }
          });
        }
      });
    }
  });

  router.post('/apps/:domain/:environment/:appname/migrateComplete', function(req, res){
    var domain = req.params.domain;
    var env = req.params.environment;
    var appname = req.params.appname;

    var cacheKey = requireParam('cacheKey', req, res);
    var appGuid = requireParam('appGuid', req, res);
    if(cacheKey && appGuid){
      logger.debug({domain: domain, env: env, appname: appname}, 'process db migrate complete request');
      models.AppMbaas.findOne({
        name: appname,
        environment: env,
        domain: domain
      }, function(err, found){
        if(err){
          return common.handleError(err, 'Error when find app mbaas instance ' + appname, 500, req, res);
        }
        if(!found){
          return common.handleError(new Error('bad request'), 'no app mbaas instance found with appname ' + appname, 400, req, res);
        } else {
          found.completeMigrate(cacheKey, appGuid, function(err, data){
            if(err){
              return common.handleError(err, 'failed to complete app db migration', 500, req, res);
            }
            return res.json(data);
          });
        }
      });
    }
  });

  router['delete']('/apps/:domain/:environment/:appname/db', function(req, res){
    var domain = req.params.domain;
    var env = req.params.environment;
    var appname = req.params.appname;

    logger.debug({domain: domain, env: env, appname: appname}, 'process app db delete request');
    models.AppMbaas.findOne({
      name: appname,
      environment: env,
      domain: domain
    }, function(err, found){
      if(err){
        return common.handleError(err, 'Error when find app mbaas instance ' + appname, 500, req, res);
      }
      if(!found){
        //no record found, nothing to do
        return res.json({});
      } else {
        found.removeDb(fhconfig, function(err){
          if(err){
            return common.handleError(err, 'Error when remove db for app ' + appname, 500, req, res);
          }
          //db is remove, remove the data entry itself
          found.remove(function(err, removed){
            if(err){
              return common.handleError(err, 'Error when remove app mbaas instance ' + appname, 500, req, res);
            }
            return res.json(removed);
          });
        });
      }
    });
  });

  router.get('/apps/:domain/:environment/:appname/env', function(req, res){
    var domain = req.params.domain;
    var env = req.params.environment;
    var appname = req.params.appname;

    logger.debug({appname: appname}, 'getting env vars for app');

    async.parallel([
      function(callback){
        models.Mbaas.findOne({domain: domain, environment: env}, callback);
      },
      function(callback){
        models.AppMbaas.findOne({name: appname}, callback);
      }
    ], function(err, results){
      if(err){
        logger.error(err, 'Failed to look up Mbaas/AppMbaas instance');
      }
      var envs = appEnv(results[0], results[1], fhconfig);
      res.json({
        env: envs
      });
    });
  });

  return router;
}

module.exports = dbRoutes;