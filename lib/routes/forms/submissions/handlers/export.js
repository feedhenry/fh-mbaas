const SubmissionExportJob = require('../../../../models').SubmissionExportJob;
var jobTypes = require('../../../../models/BaseImportExportJobSchema').types;
const util = require('util');
const express = require('express');
var logger = require('../../../../util/logger').getLogger();

// TODO: hook up with submission export job running
var spawnJob = function(params, cb) {
  var job = new SubmissionExportJob({
    domain: params.domain,
    environment: params.environment,
    jobType: jobTypes.EXPORT
  });
  job.save(cb);
};
const buildJobMiddleware = require('../../../../middleware/buildJobMiddleware');
const middleware = buildJobMiddleware(SubmissionExportJob, spawnJob, function() {
  return {jobType: jobTypes.EXPORT};
});

var router = express.Router({
  mergeParams: true
});

router.param('job_id', middleware.find);

router.get('/export', middleware.filteredJobs, function(req, res) {
  return res.send(req.jobs);
});

router.post('/export', middleware.create, function(req, res) {
  res.send(req.job);
});


router.get('/export/:job_id', function(req, res) {
  return res.send(req.job);
});

router.post('/export/:job_id',
  middleware.ensureFinishedAndRegistered,
  middleware.generateURL,
  function(req, res) {
    res.send(req.fileUrl);
  });


// eslint-disable-next-line no-unused-vars
router.use(function SubmissionsDataExportErrorHandler(err, req, res, next) {
  res.statusCode = err.code || 500;
  logger.error(util.inspect(err));
  res.json(err);
});

module.exports = router;