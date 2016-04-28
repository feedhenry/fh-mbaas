var express = require('express');
var auth = require('../../middleware/auth');
var fhconfig = require('fh-config');
var middleware = require('../../middleware/appdata');
var _ = require('underscore');



// TODO: replace with actual implementation
var fixtures = require('../../../test/fixtures/appdata');

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

router.param('job_id', middleware.findJob);

router.get('/export', function(req, res) {
  res.send(_.values(fixtures.exportJobs));
});

router.post('/export', function(req, res) {
  res.send(fixtures.createExportJob(req.params));
});


router.get('/export/:job_id', function(req, res) {
  return res.send(req.job);
});

router.post('/export/:job_id', function(req, res) {
  // register file with download service
  // generate token for download

  // send object with download url
  return res.send(fixtures.buildDownloadTarget(req.job));
});

module.exports = router;