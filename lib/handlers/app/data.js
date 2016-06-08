var express = require('express');
var auth = require('../../middleware/auth');
var fhconfig = require('fh-config');
var middleware = require('../../middleware/appdata');
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

router.get('/export', middleware.filteredJobs, function(req, res) {
  return res.send(req.jobs);
});

router.post('/export', middleware.fillStopApp, middleware.create, function(req, res) {
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
router.use(function appDataErrorHandler(err, req, res, next) {
  res.statusCode = err.code || 500;
  logger.error(util.inspect(err));
  res.json(err);
});

module.exports = router;