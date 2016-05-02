var express = require('express');
var auth = require('../../middleware/auth');
var fhconfig = require('fh-config');
var middleware = require('../../middleware/appdata');
var _ = require('underscore');
var util = require('util');
var logger = fhconfig.getLogger();

var storage = require('../../storage');
var path = require('path');

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
  // TODO: job's filePath should come from runner
  var filePath = path.resolve(__dirname, '../../../README.md');
  req.job.filePath = filePath;

  getFileId(req.job, function(err, fileId) {
    if (err) {
      err.code = 500;
      throw err;
    }
    storage.generateURL(fileId, 0, function(err, url) {
      if (err) {
        err.code = 500;
        throw err;
      }
      res.send(url);
    });
  });
});

function getFileId(job, cb) {
  if (job.fileId) {
    // already registered
    return cb(null, job.fileId);
  }

  storage.registerFile(job.filePath, function(err, file) {
    if (err) {
      return cb(err);
    }
    cb(null, file._id);
  });
}

// eslint-disable-next-line no-unused-vars
router.use(function appDataErrorHandler(err, req, res, next) {
  res.statusCode = err.code || 500;
  logger.error(util.inspect(err));
  res.json(err);
});

module.exports = router;