var _ = require('underscore');
var exportJobs = {
  1: {
    '_id': 1,
    appid: 'appid1',
    environment: 'env1',
    domain: 'domain1',
    status: 'exporting',
    step: 1,
    totalSteps: 100,
    fileSize: 80*1024*1024,
    fileDeleted: false,
    filePath: '/var/tmp/export1.tar.gz',
    progress: {
      collections: ['mbaas']
    }
  }
};

function createExportJob(params) {
  var id = Math.floor(Math.random() * 1001);
  var newJob = _.clone(exportJobs['1']);
  newJob._id = id;
  newJob.appid = params.appid;
  newJob.environment = params.environment;
  newJob.domain = params.domain;
  exportJobs[id] = newJob;
  return newJob;
}

function buildDownloadTarget(job) {
  return {
    url: 'files.eng1.skunkhenry.com/api/storage/' + job._id + '.tar.gz'
  };
}


module.exports = {
  exportJobs: exportJobs,
  createExportJob: createExportJob,
  buildDownloadTarget: buildDownloadTarget
};