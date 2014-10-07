/**
 * DB API
 */

var express = require('express');
var util = require('util');
var logger = require('../util/logger.js').getLogger();
var config = require('../util/config.js').getConfig();
var _ = require('underscore');
var common = require('../util/common');

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
      mbaas.createDomainDBForEnv(domain, env, config.fhmbaas, function(err, dbConf){
        if(err){
          return common.handleError(err, 'Failed to create db', 500, req, res);
        }
        res.json({'uri': util.format('mongodb://%s:%s@%s:%s/%s', dbConf.user, dbConf.pass, dbConf.host, dbConf.port, dbConf.name)});
      });
    });
  });

  return router;
}

module.exports = dbRoutes;