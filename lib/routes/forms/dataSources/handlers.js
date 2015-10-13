var fhForms = require('fh-forms');
var async = require('async');
var serviceServices = require('../../../services/services');
var fhConfig = require('fh-config');
var logger = fhConfig.getLogger();

/**
 * Handler For Getting A Single Data Source
 * @param req
 * @param res
 * @param next
 */
function get(req, res, next){
  async.waterfall([
    function(cb){
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {
        _id: req.params.id
      }, cb);
    }
  ], function(err, result){
    if(err){
      return next(err);
    }

    res.json(result);
  });
}

/**
 * Handler For Listing Data Sources
 * @param req
 * @param res
 * @param next
 */
function list(req, res, next){
  async.waterfall([
    function(cb){
      fhForms.core.dataSources.list({
        uri: req.mongoUrl
      }, {}, cb);
    }
  ], function(err, result){
    if(err){
      return next(err);
    }

    res.json(result);
  });
}

/**
 * Handler For Deploying A Data Source
 * @param req
 * @param res
 * @param next
 */
function deploy(req, res, next){
  async.waterfall([
    function(cb){
      fhForms.core.dataSources.deploy({
        uri: req.mongoUrl
      }, req.body, cb);
    },
    function(dataSource, cb){
      serviceServices.addDataSource({
        domain: req.params.domain,
        guid: dataSource.serviceGuid,
        dataSourceId: dataSource._id,
        mongoUrl: req.mongoUrl
      }, function(err){
        cb(err, dataSource);
      });
    }
  ], function(err, result){
    if(err){
      logger.error("Error Deploying Data Source ", {error: err});
      return next(err);
    }

    logger.debug("Finished Deploying Data Source", result);

    res.json(result);
  });
}

/**
 * Handler For Validating A Data Source
 * @param req
 * @param res
 * @param next
 */
function validate(req, res, next){
  async.waterfall([
    function(cb){
      fhForms.core.dataSources.validate({
        uri: req.mongoUrl
      }, req.body, cb);
    }
  ], function(err, result){
    if(err){
      return next(err);
    }

    res.json(result);
  });
}

/**
 * Handler For Removing A Data Source
 * @param req
 * @param res
 * @param next
 */
function remove(req, res, next){
  async.waterfall([
    function(cb){
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {_id: req.params.id}, cb);
    },
    function(dataSource, cb){
      if(!dataSource){
        return cb();
      }

      serviceServices.removeDataSource({
        domain: req.params.domain,
        guid: dataSource.serviceGuid,
        dataSourceId: dataSource._id,
        mongoUrl: req.mongoUrl
      }, cb);
    },
    function(cb){
      fhForms.core.dataSources.remove({
        uri: req.mongoUrl
      }, {_id: req.params.id}, cb);
    }
  ], function(err){
    if(err){
      if(err.code !== "FH_FORMS_NOT_FOUND"){
        return next(err);
      }
    }

    res.status(204).end();
  });
}

module.exports = {
  get: get,
  list: list,
  deploy: deploy,
  validate: validate,
  remove: remove
};