var _ = require('underscore');
var baseJob = {
  jobType: "export",
  appid: 'appid',
  environment: 'env',
  domain: 'domain',
  status: 'running',
  step: 1,
  totalSteps: 100,
  metadata: {
    fileSize: 80 * 1024 * 1024,
    fileDeleted: false,
    filePath: '/var/tmp/export1.tar.gz',
    stopApp: false
  },
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