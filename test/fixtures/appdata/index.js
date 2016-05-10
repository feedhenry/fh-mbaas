var _ = require('underscore');
var baseJob = {
  appid: 'appid',
  environment: 'env',
  domain: 'domain',
  status: 'exporting',
  step: 1,
  totalSteps: 100,
  fileSize: 80*1024*1024,
  fileDeleted: false,
  filePath: '/var/tmp/export1.tar.gz',
  progress: {
    collections: ['mbaas']
  }
};

exports.createJob = function(suffix) {
  var data = _.clone(baseJob);
  data.appid = data.appid + suffix;
  data.environment = data.environment + suffix;
  data.domain = data.domain + suffix;
  return data;
};