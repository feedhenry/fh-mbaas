var async = require('async');
var requestEndpointData = require('./requestEndpointData');
var updateDataSourceCache = require('./updateDataSourceCache');
var log = require('../logger').getLogger();

/**
 * Calling A Service Endpoint And Updating A Data Source
 * @param params
 *  - currentTime:
 *  - fullUrl:
 *  - accessKey:
 *  - mongoUrl:
 *  - dataSourceId:
 *  - error: [optional]
 * @param cb
 */
module.exports = function(params, cb) {
  //3.a.e.b Call Endpoint
  //3.a.e.c Call Update Data Source Cache

  log.logger.debug("updateSingleDataSource", params);

  async.waterfall([
    function getServiceData(cb) {

      //If there is an error, don't call the service. Just Update The Data Source With The Error
      if (params.error) {
        return cb(undefined, {
          error: params.error
        });
      }

      requestEndpointData({
        fullUrl: params.fullUrl,
        accessKey: params.accessKey
      }, function(err, returnedData) {
        return cb(undefined, {
          error: err,
          data: returnedData
        });
      });
    },
    function updateDSCache(endpointParams, cb) {
      updateDataSourceCache({
        currentTime: params.currentTime,
        mongoUrl: params.mongoUrl,
        dataSourceId: params.dataSourceId,
        data: endpointParams.data,
        error: endpointParams.error
      }, function(err) {
        if (err) {
          log.logger.error("Error Updating Data Source ", err);
        }

        return cb(err);
      });
    }

  ], cb);
};