var fhForms = require('fh-forms');
var async = require('async');
var _ = require('underscore');
var serviceServices = require('../../../services/services');
var dataSourceUpdaterModule = require('../../../dataSourceUpdater');
var getDeployedService = require('../../../services/appmbaas/getDeployedService');
var url = require('url');
var logger = require('../../../util/logger').getLogger();
var dataSourceUpdater;

/**
 * Handler For Getting A Single Data Source
 * @param req
 * @param res
 * @param next
 */
function get(req, res, next) {
  async.waterfall([
    function(cb) {
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {
        _id: req.params.id
      }, cb);
    }
  ], function(err, result) {
    if (err) {
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
function list(req, res, next) {
  async.waterfall([
    function(cb) {
      fhForms.core.dataSources.list({
        uri: req.mongoUrl
      }, {}, cb);
    }
  ], function(err, result) {
    if (err) {
      return next(err);
    }

    res.json(result);
  });
}

/**
 * Sending A Request To Service
 * @param deployedService
 * @param cb
 */
function getServiceData(dataSource, deployedService, cb) {

  logger.debug("deployedService", {
    deployedService:deployedService
  });

  //Try and get data source data set.

  //Only want a single instance
  if (!dataSourceUpdater) {
    dataSourceUpdater = dataSourceUpdaterModule(logger);
  }

  var serviceHost = deployedService.url || "";
  var path = dataSource.endpoint || "";
  var fullUrl = url.resolve(serviceHost, path);

  dataSourceUpdater.handlers.requestEndpointData({
    fullUrl: fullUrl,
    accessKey: deployedService.serviceAccessKey
  }, function(err, serviceData) {
    if (err) {
      logger.error("Error Getting Service Data ", {error: err});
      dataSource.validationResult = {
        valid: false,
        message: err.userDetail
      };
      return cb(dataSource);
    }

    if (!serviceData) {
      logger.error("No Service Data Passed ");
      dataSource.validationResult = {
        valid: false,
        message: err.userDetail
      };
      return cb(dataSource);
    }

    //Assigning The Data. Useful for viewing the validation result.
    dataSource.data = serviceData;

    logger.debug("serviceData", {
      serviceData:serviceData
    });

    cb(undefined, serviceData);
  });
}

function updateSingleDataSource(req, dataSource, deployedService, cb) {
  var fullUrl;
  var error;
  var currentTime = new Date();

  logger.debug("updateSingleDataSource ", {
    deployedService: deployedService,
    dataSource: dataSource
  });
  //If there is no deployed service, update the data source to note that the service has not been deployed.
  if (!deployedService) {
    deployedService = {};
    error = {
      userDetail: "Service is not deployed.",
      systemDetail: "The Service associated with this Data Source has not been deployed to this environment.",
      code: "DS_SERVICE_NOT_DEPLOYED"
    };
  } else {
    var serviceHost = deployedService.url || "";
    var path = dataSource.endpoint;
    fullUrl = url.resolve(serviceHost, path);
  }

  //Only want a single instance
  if (!dataSourceUpdater) {
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
}

/**
 * Handler For Deploying A Data Source
 * @param req
 * @param res
 * @param next
 */
function deploy(req, res, next) {
  logger.debug("Deploy Data Source ", req.body);

  var dataSource = req.body || {};

  async.waterfall([
    function(cb) {
      fhForms.core.dataSources.deploy({
        uri: req.mongoUrl
      }, dataSource, cb);
    },
    function(dataSource, cb) {
      serviceServices.addDataSource({
        domain: req.params.domain,
        guid: dataSource.serviceGuid,
        dataSourceId: dataSource._id,
        mongoUrl: req.mongoUrl
      }, function(err) {
        cb(err, dataSource);
      });
    }
  ], function(err, deployedDataSource) {
    if (err) {
      logger.error("Error Deploying Data Source ", {error: err});
      return next(err);
    }

    logger.debug("Finished Deploying Data Source", deployedDataSource);

    res.json(deployedDataSource);

    //When finished with the deploy, trigger an update of the Data Source
    async.waterfall([
      function getDeployedServ(cb) {
        //Get A Deployed Service Related To The Data Source
        getDSDeployedService(req, deployedDataSource, function(err, deployedService) {
          deployedDataSource = checkDataSourceService(deployedDataSource, deployedService);
          cb(undefined, {
            deployedDataSource: deployedDataSource,
            deployedService: deployedService
          });
        });
      },
      function updateDataSourceDataSet(params, cb) {
        updateSingleDataSource(req, params.deployedDataSource, params.deployedService, cb);
      }
    ], _.noop());
  });
}

/**
 * Getting A Deployed Service Related To A Data Source
 * @param req
 * @param dataSource
 * @param cb
 */
function getDSDeployedService(req, dataSource, cb) {
  //Get A Deployed Service Related To The Data Source

  logger.debug("getDSDeployedService ", dataSource);

  getDeployedService({
    mongoUrl: req.mongoUrl,
    domain: req.params.domain,
    guid: dataSource.serviceGuid,
    environment: req.params.environment
  }, function(err, deployedService) {
    logger.debug("getDSDeployedService ", deployedService);
    cb(undefined, deployedService);
  });
}


function checkDataSourceService(dataSource, deployedService) {
  if (!deployedService) {
    dataSource.validationResult = {
      valid: false,
      message: "The Service associated with this Data Source has not been deployed to this environment."
    };
  }

  return dataSource;
}

/**
 * Handler For Validating A Data Source
 * @param req
 * @param res
 * @param next
 */
function validate(req, res, next) {

  //Check That The Service Is Deployed,
  //Try To Request Service Data
  //Validate Service Data

  logger.debug("Validate Data Source", {
    params: req.params,
    dataSource: req.body
  });

  var dataSource = req.body || {};

  async.waterfall([
    function getDSDeployedServ(cb) {
      getDSDeployedService(req, dataSource, function(err, deployedService) {
        //No Deployed service, mark the Data Source as error for saving to the database.
        dataSource = checkDataSourceService(dataSource, deployedService);

        //If the data source is invalid, pass it as the error param to skip the remaining steps
        if (dataSource.validationResult && !dataSource.validationResult.valid) {
          return cb(dataSource);
        } else {
          return cb(undefined, deployedService);
        }
      });
    },
    function getDSServiceData(deployedService, cb) {
      getServiceData(dataSource, deployedService, cb);
    },
    function validateDataSource(serviceData, cb) {
      logger.debug("Calling Validate ", {
        uri: req.mongoUrl
      }, dataSource);

      fhForms.core.dataSources.validate({
        uri: req.mongoUrl
      }, dataSource, cb);
    }
  ], function(err, validationResult) {
    if (err && err !== dataSource) {
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
function remove(req, res, next) {
  async.waterfall([
    function(cb) {
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {_id: req.params.id}, cb);
    },
    function(dataSource, cb) {
      fhForms.core.dataSources.remove({
        uri: req.mongoUrl
      }, {_id: req.params.id}, function(err) {
        cb(err, dataSource);
      });
    },
    function(dataSource, cb) {
      if (!dataSource) {
        return cb();
      }

      serviceServices.removeDataSource({
        domain: req.params.domain,
        guid: dataSource.serviceGuid,
        dataSourceId: dataSource._id,
        mongoUrl: req.mongoUrl
      }, cb);
    }
  ], function(err) {
    if (err && err.code !== "FH_FORMS_NOT_FOUND") {
      return next(err);
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
function refresh(req, res, next) {
  async.waterfall([
    function getDataSource(cb) {
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {_id: req.params.id}, cb);
    },
    function getDeployedServ(dataSource, cb) {
      //Get A Deployed Service Related To The Data Source
      getDSDeployedService(req, dataSource, function(err, deployedService) {
        //No Deployed service, mark the Data Source as error for saving to the database.
        dataSource = checkDataSourceService(dataSource, deployedService);
        cb(err, {
          dataSource: dataSource,
          deployedService: deployedService
        });
      });
    },
    function updateDataSourceDataSet(params, cb) {
      updateSingleDataSource(req, params.dataSource, params.deployedService, cb);
    },
    function getDataSourceAgain(cb) {
      //Get the latest State Of The Data Source After The Forced Refresh - Nice API friendly response
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {_id: req.params.id}, cb);
    }
  ], function(err, result) {
    if (err) {
      return next(err);
    }

    res.status(200).json(result);
  });
}

/**
 * Getting An Audit Log Related To A Data Source
 * @param req
 * @param res
 * @param next
 */
function getAuditLogs(req, res, next) {
  async.waterfall([
    function(cb) {
      fhForms.core.dataSources.get({
        uri: req.mongoUrl
      }, {
        _id: req.params.id,
        includeAuditLog: true
      }, cb);
    }
  ], function(err, dataSourceWithAuditLog) {
    if (err) {
      return next(err);
    }

    logger.debug("Responding With Audit Logs");

    res.json(dataSourceWithAuditLog);
  });
}


/**
 * getAuditLogEntry - Getting A Full Audit Log Entry Including Data
 *
 * @param  {type} req  description
 * @param  {type} res  description
 * @param  {type} next description
 * @return {type}      description
 */
function getAuditLogEntry(req, res, next) {
  async.waterfall([
    function(cb) {
      fhForms.core.dataSources.getAuditLogEntry({
        uri: req.mongoUrl
      }, {
        _id: req.params.logid
      }, cb);
    }
  ], function(err, auditLog) {
    if (err) {
      return next(err);
    }

    logger.debug("Responding With Audit Logs");

    res.json(auditLog);
  });
}

module.exports = {
  get: get,
  list: list,
  deploy: deploy,
  validate: validate,
  remove: remove,
  refresh: refresh,
  getAuditLog: getAuditLogs,
  getAuditLogEntry: getAuditLogEntry
};
