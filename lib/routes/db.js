var express = require('express');
var util = require('util');
var logger = require('../util/logger.js').getLogger();
var config = require('../util/config.js').getConfig();
var common = require('../util/common');

function requireParam(name, req, res){
  var param = req.body[name];
  if(!param || param.lengh <=0 ){
    common.handleError(new Error('Missing param ' + name), 'Missing param ' + name, 400, req, res);
    return null;
  }
  return param;
}

function dbRoutes(mbaas) {
  var router = new express.Router();
  var models = mbaas.models;

  router.post('/:domain/:environment/db', function(req, res) {
    var domain = req.params.domain;
    var env = req.params.environment;
    logger.debug({domain: domain, env: env}, 'process db create request');
    models.Mbaas.findOrCreateByDomainEnv(domain, env, function(err, mbaas){
      if(err){
        return common.handleError(err, 'Failed to get mbaas instance', 500, req, res);
      }
      mbaas.createDb(config.fhmbaas, function(err, dbConf){
        if(err){
          return common.handleError(err, 'Failed to create db', 500, req, res);
        }
        return res.json({'uri': util.format('mongodb://%s:%s@%s:%s/%s', dbConf.user, dbConf.pass, dbConf.host, dbConf.port, dbConf.name)});
      });
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
      models.AppMbaas.findOrCreateByName(appname, domain, env, function(err, appmbaas){
        if(err){
          return common.handleError(err, 'Failed to get app mbaas instance', 500, req, res);
        }
        if(appmbaas.locked){
          return common.handleError(new Error('locked'), 'Migration is in progress', 423, req, res);
        } else {
          appmbaas.createDb(config.fhmbaas, function(err, dbConf){
            if(err){
              return common.handleError(err, 'Failed to create db for app ' + appname, 500, req, res);
            } else {
              appmbaas.stopApp(function(err){
                if(err){
                  return common.handleError(err, 'Failed to stop app ' + appname, 500, req, res);
                }
                appmbaas.migrateDb(cacheKey, appGuid, function(err, data){
                  if(err){
                    return common.handleError(err, 'Error when try to migrate db for app ' + appname, 500, req, res);
                  }
                  return res.json(data);
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
        found.removeDb(config.fhmbaas, function(err){
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

  return router;
}

module.exports = dbRoutes;