var async = require('async');
var fhMbaasMiddleware = require('fh-mbaas-middleware');
var log = require('../logger').getLogger();
var processEnvDataSources = require('./processEnvDataSources');


/**
 * Function To Update A Set Of Data Sources For All Environments.
 *
 * @param params
 * @param callback
 */
function updateEnvDataSourceCache(params, callback) {
  //1. List All Environments And Domains
  //2. Group Envs By Domain

  var currentTime = new Date();

  log.logger.debug("updateEnvDataSourceCache ", {
    currentTime: currentTime
  });

  async.waterfall([
    function listAllDomainEnvironments(cb) {

      fhMbaasMiddleware.mbaas().find({}, function(err, envConfigEntries) {
        if (err) {
          log.logger.error("Error Getting Mbaas Configs ", {error: err});
        } else {
          log.logger.debug("listAllDomainEnvironments ", {
            currentTime: currentTime,
            envConfigEntries: envConfigEntries
          });
        }

        cb(err, envConfigEntries || []);
      });
    },
    function processsEnvData(envConfigEntries, envCb) {
      //3. For Each Domain
      //3.a For Each Env In Domain
      log.logger.debug("processsEnvData ", {
        currentTime: currentTime,
        envConfigEntries: envConfigEntries
      });

      async.map(envConfigEntries, function(envConfigEntry, cb) {

        log.logger.debug("processsEnvData Single Config", {
          currentTime: currentTime,
          envConfigEntry: envConfigEntry
        });
        processEnvDataSources({
          envConfigEntry: envConfigEntry,
          currentTime: currentTime
        }, cb);
      }, envCb);
    }
  ], function(err, result) {
    callback(err, result);
  });
}

module.exports = {
  updateEnvDataSourceCache: updateEnvDataSourceCache
};