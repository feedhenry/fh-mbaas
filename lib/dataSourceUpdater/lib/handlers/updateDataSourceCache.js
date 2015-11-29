var fhForms = require('fh-forms');
var logger = require('fh-config').getLogger();
var _ = require('underscore');


/**
 * Updating The Cache For A Single Data Source
 * @param params
 *  - currentTime:
 *  - mongoUrl:
 *  - dataSourceId:
 *  - data: [optional],
 *  - error: [optional]
 * @param cb
 */
function updateDataSource(params, cb){

  logger.debug("updateDataSource ", {
    uri: params.mongoUrl
  }, [{
    _id: params.dataSourceId,
    data: params.data,
    error: params.error
  }]);

  var dsData = {
    _id: params.dataSourceId
  };

  dsData.dataError = params.error;
  dsData.data = params.error ? [] : params.data;

  //Need To Update The Data Source Cache
  fhForms.core.dataSources.updateCache({
    uri: params.mongoUrl
  }, [dsData], {
    currentTime: params.currentTime
  }, function(err, dsUpdateResult){
    dsUpdateResult = dsUpdateResult || {};
    if(err){
      logger.error("Error Updating Data Source ", {error: err, params: params});
    } else {
      logger.debug("Data Source Updated Successully ", dsUpdateResult.validDataSourceUpdates);
    }

    //Cache Updated - moving on.
    return cb(undefined, _.first(dsUpdateResult.validDataSourceUpdates));
  });
}
module.exports = updateDataSource;