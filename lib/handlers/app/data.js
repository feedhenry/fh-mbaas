var express = require('express');
var auth = require('../../middleware/auth');
var fhconfig = require('fh-config');
var middleware = require('../../middleware/appdata');
var import_middleware = require('../../middleware/appdata_import');
var util = require('util');
var logger = fhconfig.getLogger();

/**
 * Router for app data import and export
 * to be mounted on /mbaas/:domain/:environment/:appid/data/
 * @see docs/api/appdata.yaml
 * @type {express.Router}
 */
var router = express.Router({
  mergeParams: true
});

router.use(auth.admin(fhconfig));

router.param('job_id', middleware.find);

// List export jobs
router.get('/export', middleware.filteredJobs, function(req, res) {
  return res.send(req.jobs);
});

// List import jobs
router.get('/import', import_middleware.filteredJobs, function(req, res) {
  return res.send(req.jobs);
});

// Start export job
router.post('/export', middleware.fillStopApp, middleware.create, function(req, res) {
  res.send(req.job);
});

// Start import job
router.post('/import',
  import_middleware.fillBody,
  import_middleware.registerUpload,
  import_middleware.create,
  import_middleware.generateURL, function(req, res) {
    // fhc is only interested in jobId and url
    res.send({
      jobId: req.job._id,
      url: req.fileUrl
    });
  });

// Read export job
router.get('/export/:job_id', function(req, res) {
  return res.send(req.job);
});

// Read import job
router.get('/import/:job_id', function(req, res) {
  return res.send(req.job);
});

router.post('/export/:job_id',
  middleware.ensureFinishedAndRegistered,
  middleware.generateURL,
  function (req, res) {
    res.send(req.fileUrl);
  });


// eslint-disable-next-line no-unused-vars
router.use(function appDataErrorHandler(err, req, res, next) {
  res.statusCode = err.code || 500;
  logger.error(util.inspect(err));
  res.json(err);
});

module.exports = router;