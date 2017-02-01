var async = require('async');
var log = require('../logger').getLogger();
var _ = require('underscore');
var url = require('url');
var dataSourceServices = require('../../../services/appForms/dataSources');
var listDeployedServices = require('../../../services/appmbaas/listDeployedServices');
var updateSingleDataSource = require('./updateSingleDataSource');
var mongoDbUri = require('mongodb-uri');


function formatDbUri(dbConf) {

  var config = {
    username: dbConf.user,
    password: dbConf.pass,
    database: dbConf.name,
    hosts: []
  };

  //The mongo config.host for fh-mbaas is a string of comma-separated values.
  dbConf.host = dbConf.host || "";
  var hosts = dbConf.host.split(',');
  config.hosts = _.map(hosts, function(host, index) {
    var hostEntry = {
      host: host
    };

    if (_.isArray(dbConf.port)) {
      hostEntry.port = dbConf.port[index] || 27017;
    } else {
      hostEntry.port = dbConf.port;
    }

    return hostEntry;
  });

  //Adding the replica set option if required
  if (_.isString(dbConf.replicaset_name)) {
    config.options = config.options || {};
    config.options.replicaSet = dbConf.replicaset_name;
  }

  return mongoDbUri.format(config);
}

/**
 * Processing Data Sources For A Single Environment
 * @param params
 *  - currentTime: The time to compare data sources with
 *  - envConfigEntry: Environment Configuration
 *   - domain:
 *   - env: Environment ID
 *   - dbConf: Mongo Connection Details
 *    - user: Username
 *    - pass: Password
 *    - host: Mongo Connection Host
 *    - port: Mongo Connection Port
 *    - name: Env DB Name
 * @param callback
 * @returns {*}
 */
function processEnvDataSources(params, callback) {
  //3.a.a Get Env DB Config
  //3.a.b Connect To Env Db
  //3.a.c List Data Sources
  //3.a.d List Deployed Services

  log.logger.debug("processEnvDataSources", params);

  var currentTime = params.currentTime;
  var envConfigEntry = params.envConfigEntry;

  var dbConf = envConfigEntry.dbConf;
  if (!dbConf) {
    log.logger.error("No Db Config For Environment ", envConfigEntry);
    return callback(new Error("No Database Config Available For Environment " + envConfigEntry.env));
  }

  envConfigEntry.dbConf.mongoUrl = formatDbUri(dbConf);

  log.logger.debug("processEnvDataSources", envConfigEntry);

  async.waterfall([
    function getEnvDataSourcesAndServices(envDataCb) {

      log.logger.debug("getEnvDataSourcesAndServices", envConfigEntry);

      async.parallel({
        dataSources: function listDataSources(dsCb) {
          log.logger.debug("listDataSources", {
            mongoUrl: envConfigEntry.dbConf.mongoUrl,
            currentTime: currentTime
          });
          //Only Want Data Sources That Need To Be Updated. I.e. lastUpdated + interval < currentTime
          dataSourceServices.listForUpdate({
            mongoUrl: envConfigEntry.dbConf.mongoUrl,
            currentTime: currentTime
          }, dsCb);
        },
        deployedServices: function listEnvDeployedServices(servCb) {
          log.logger.debug("listEnvDeployedServices", {
            domain: envConfigEntry.domain,
            environment: envConfigEntry.environment
          });
          listDeployedServices({
            domain: envConfigEntry.domain,
            environment: envConfigEntry.environment
          }, servCb);
        }
      }, function(err, dataSourcesAndServices) {
        //If An Error Happens Here, Can't update the Data Source with the error.
        if (err) {
          log.logger.error("Error Getting Data Sources And Services ", {error: err, params: params});
        } else {
          log.logger.debug("getEnvDataSourcesAndServices", dataSourcesAndServices);
        }
        return envDataCb(err, {
          envConfigEntry: envConfigEntry,
          dataSources: dataSourcesAndServices.dataSources,
          deployedServices: dataSourcesAndServices.deployedServices
        });
      });
    },
    function updateAllEnvDataSources(envDataSourcesAndServices, updateCb) {
      //3.a.e For Each Data Source
      //3.a.e.a Get Service Host

      log.logger.debug("updateAllEnvDataSources", envDataSourcesAndServices);

      async.each(envDataSourcesAndServices.dataSources, function(dataSource, cb) {

        log.logger.debug("updateAllEnvDataSources", dataSource);
        var error;
        var serviceGuid = dataSource.serviceGuid;
        var deployedService = _.findWhere(envDataSourcesAndServices.deployedServices, {guid: serviceGuid});

        var fullUrl;
        //If there is no deployed service, update the data source to note that the service has not been deployed.
        if (!deployedService) {
          deployedService = {};
          error = {
            userDetail: "Service is not deployed.",
            systemDetail: "The Service associated with this Data Source has not been deployed to this environment.",
            code: "DS_SERVICE_NOT_DEPLOYED"
          };
        } else {
          var serviceHost = deployedService.url;
          var path = dataSource.endpoint;
          fullUrl = url.resolve(serviceHost, path);
        }

        log.logger.debug("updateSingleDataSource ", {
          mongoUrl: envConfigEntry.dbConf.mongoUrl,
          error: error,
          fullUrl: fullUrl,
          accessKey: deployedService.serviceAccessKey,
          dataSourceId: dataSource._id
        });

        updateSingleDataSource({
          currentTime: currentTime,
          mongoUrl: envConfigEntry.dbConf.mongoUrl,
          error: error,
          fullUrl: fullUrl,
          accessKey: deployedService.serviceAccessKey,
          dataSourceId: dataSource._id
        }, function(err) {
          if (err) {
            log.logger.debug("Error Updating A Data Source ", err);
          }
          return cb();
        });

      }, updateCb);
    }
  ], callback);


}

module.exports = processEnvDataSources;
