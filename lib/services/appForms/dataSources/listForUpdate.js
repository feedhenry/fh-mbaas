var fhForms = require('fh-forms');

module.exports = function listDataSourcesForUpdate(params, cb) {
  //Only Want Data Sources That Need To Be Updated. I.e. lastUpdated + interval < currentTime
  fhForms.core.dataSources.list({
    uri: params.mongoUrl
  }, {
    currentTime: params.currentTime,
    listDataSourcesNeedingUpdate: true
  }, function(err, dataSourcesNeedingUpdate) {
    cb(err, dataSourcesNeedingUpdate || []);
  });
};