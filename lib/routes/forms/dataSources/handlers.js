var fhForms = require('fh-forms');
var async = require('async');
var _ = require('underscore');
var serviceServices = require('../../../services/services');
var dataSourceUpdaterModule = require('../../../dataSourceUpdater');
var getDeployedService = require('../../../services/appmbaas/getDeployedService');
var fhConfig = require('fh-config');
var url = require('url');
var logger = fhConfig.getLogger();
var dataSourceUpdater;

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

  //Check That The Service Is Deployed,
  //Try To Request Service Data
  //Validate Service Data

  logger.debug("Validate Data Source", {
    params: req.params,
    dataSource: req.body
  });

  var dataSource = req.body || {};

  async.waterfall([
    function getDeployedServ(cb){
      //Get A Deployed Service Related To The Data Source

      getDeployedService({
        mongoUrl: req.mongoUrl,
        domain: req.params.domain,
        guid: dataSource.serviceGuid,
        environment: req.params.environment
      }, function(err, deployedService){

        if(!deployedService){
          dataSource.validationResult = {
            valid: false,
            message: "No Service With Guid " + dataSource.serviceGuid + " Deployed To Environemnt ID" + req.params.environment
          };
        }

        cb(undefined, deployedService || false);
      });
    },
    function getServiceData(deployedService, cb){

      logger.debug("deployedService", {
        deployedService:deployedService
      });

      //If No Deployed Service, Don't Try And Request Data
      if(!deployedService){
        return cb();
      }

      //Try and get data source data set.

      //Only want a single instance
      if(!dataSourceUpdater){
        dataSourceUpdater = dataSourceUpdaterModule(logger);
      }

      var serviceHost = deployedService.url;
      var path = dataSource.endpoint || "";
      var fullUrl = url.format(url.parse(serviceHost + path));

      dataSourceUpdater.handlers.requestEndpointData({
        fullUrl: fullUrl,
        accessKey: deployedService.serviceAccessKey
      }, function(err, serviceData){
        if(err){
          logger.error("Error Getting Service Data ", {error: err});
          dataSource.validationResult = {
            valid: false,
            message: err.userDetail
          };
        }

        //Assigning The Data. Useful for viewing the validation result.
        dataSource.data = serviceData;

        logger.debug("serviceData", {
          serviceData:serviceData
        });

        cb(undefined, serviceData || false);
      });
    },
    function validateDataSource(serviceData, cb){

      //If No Service Data, Then No Need to Validate The Data Set.
      if(!serviceData){
        return cb();
      }

      logger.debug("Calling Validate ", {
        uri: req.mongoUrl
      }, dataSource);

      fhForms.core.dataSources.validate({
        uri: req.mongoUrl
      }, dataSource, cb);
    }
  ], function(err, validationResult){
    if(err){
      logger.error("Error Validating Data Source", err);
      return next(err);
    }

    logger.debug("Validation Result ", validationResult || dataSource);

    //The Response Is Either The Full Validation Result Or It Never Got That Far.
    res.json(validationResult || dataSource);
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
      fhForms.core.dataSources.remove({
        uri: req.mongoUrl
      }, {_id: req.params.id}, function(err){
        cb(err, dataSource);
      });
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

/**
 * Forcing A Refresh Of A Data Source
 * @param req
 * @param res
 * @param next
 */
function refresh(req, res, next){

  var currentTime = new Date();
  async.waterfall([
    function getDataSource(cb){
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {_id: req.params.id}, cb);
    },
    function getDeployedServ(dataSource, cb){
      //Get A Deployed Service Related To The Data Source

      getDeployedService({
        mongoUrl: req.mongoUrl,
        domain: req.params.domain,
        guid: dataSource.serviceGuid,
        environment: req.params.environment
      }, function(err, deployedService){
        cb(err, dataSource, deployedService);
      });
    },
    function updateDataSource(dataSource, deployedService, cb){
      var fullUrl;
      var error;
      //If there is no deployed service, update the data source to note that the service has not been deployed.
      if (!deployedService) {
        deployedService = {};
        error = {
          userDetail: "Service Is Not Deployed For This Data Source",
          systemDetail: "No Service With guid " + dataSource.serviceGuid + " is deployed to environment " + req.params.environment,
          code: "DS_SERVICE_NOT_DEPLOYED"
        };
      } else {
        var serviceHost = deployedService.url;
        var path = dataSource.endpoint;
        fullUrl = url.format(url.parse(serviceHost + path));
      }

      //Only want a single instance
      if(!dataSourceUpdater){
        dataSourceUpdater = dataSourceUpdaterModule(logger);
      }

      dataSourceUpdater.handlers.updateSingleDataSource({
        currentTime: currentTime,
        mongoUrl: req.mongoUrl,
        error: error,
        fullUrl: fullUrl,
        accessKey: deployedService.serviceAccessKey,
        dataSourceId: dataSource._id
      }, cb);
    },
    function getDataSourceAgain(cb){
      //Get the latest State Of The Data Source After The Forced Refresh - Nice API friendly response

      logger.debug("Get Form Again ", arguments);
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {_id: req.params.id}, cb);
    }
  ], function(err, result){
    if(err){
      return next(err);
    }

    res.status(200).json(result);
  });
}

module.exports = {
  get: get,
  list: list,
  deploy: deploy,
  validate: validate,
  remove: remove,
  refresh: refresh
};