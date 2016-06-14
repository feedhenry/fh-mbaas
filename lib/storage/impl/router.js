var express = require('express');
var config = require('fh-config');
var logger = config.getLogger();
var storage = require("..");
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var async = require('async');

var AppdataJob = require('../../models').AppdataJob;

const UPLOAD_PATH = config.value("fhmbaas.appdata_jobs.upload_dir");

var upload = multer({
  dest: UPLOAD_PATH
});

var router = express.Router({
  mergeParams: true
});

/**
 * Download route.
 *
 * Provides binary content for specified parameters.
 *
 * @param resourceId - id of resource to be dowloaded
 * @queryParam token - token that will be used to download file
 *
 * @return binaryFile (application/octet-stream)
 */
router.get('/:resourceId', function(req, res) {
  var fileReference = req.params.resourceId;
  var tokenId = req.query.token;
  storage.getFileIfValid(fileReference, tokenId, function(err, found) {
    if (err) {
      return res.status(err.code || 500)
        .send("Cannot download file. Reason:" + err);
    }
    if (!found) {
      return res.status(404)
        .send("Invalid or outdated resource URL. Please generate new URL.");
    }
    var options = {
      root: found.directory,
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),

        // Never open content in browser, force download
        "Content-Type": "application/octet-stream",

        // hint for browser.
        "Content-Disposition": "attachment; filename=" + found.fileName
      }
    };
    res.sendFile(found.fileName, options, function(err) {
      if (err) {
        logger.error("Problem when sending file to client", {err: err});
        return res.status(err.status).end();
      }
      logger.info('Sent:', found.fileName);
    });
  });
});

/**
 * Upload route. This route will be invoked for appdata tar archive uploads.
 * It must interact with a job entity and set it's state according to the
 * upload status.
 *
 * @param resourceId pre-registered file reference to upload to
 * @queryParam token the token that will be used to upload file
 */
router.post('/:jobId/:resourceId/', function(req, res) {
  var fileReference = req.params.resourceId;
  var tokenId = req.query.token;
  var jobId = req.params.jobId;

  /**
   * If the upload fails for whatever reason (connection lost,
   * out-of disk space) we have to mark the job as failed.
   * @param reason Fail reason. String or exception object.
   */
  function failJob(reason, done) {
    async.waterfall([
      async.apply(AppdataJob.findById.bind(AppdataJob), jobId),
      function (job, cb) {
        if (!job) {
          return cb();
        }
        job.fail(reason && reason.message || reason, cb);
      }
    ], done);
  }

  /**
   * If the upload finishes successfully and the file could be
   * stored on disk we have to update it's metadata in the job
   * model.
   *
   * We do not use the original file name to save the uploaded file
   * to avoid clashes. So after the upload has finished we have to
   * set the actual filename so that the scheduler can pick it up.
   *
   * @param fullPath The full path of the uploaded file
   */
  function commitJob(fullPath, done) {
    async.waterfall([
      async.apply(AppdataJob.findById.bind(AppdataJob), jobId),
      function (job, cb) {
        // Set the actual file name after the file is stored
        // on disk (different to the original file name)
        job.updateMetadata("filePath", fullPath);

        // To tell the scheduler that the job can be started
        job.updateMetadata("uploadFinished", true);
        job.save(cb);
      }
    ], done);
  }

  // Upload
  async.waterfall([
    // Check if the transmitted file id and token are valid
    async.apply(storage.checkToken, fileReference, tokenId),

    // Process the actual upload
    function (file, callback) {
      upload(req, res, callback);
    },

    // After the upload has finished, fetch the location of the
    // uploaded file
    function (callback) {
      callback(null, path.join(UPLOAD_PATH, req.files.file.name));
    },

    //Update job metadata
    function (fullPath, callback) {
      commitJob(fullPath, callback);
    }
  ], function(err, result) {
    if (err) {
      return failJob(err, function () {
        return res.status(500).send({
          message: "Upload failed with " + err
        });
      });
    }

    res.status(200).send(result);
  });
});

/**
 * Host route.
 *
 * Fetch mbaas host (mbaas url) to determine where resource was stored
 * Internal endpoint used by proxy to determine which mbaas should be called to get file
 * (Ugly hack done because of platform limitations)
 */
router.get('/host/:resourceId', function(req, res) {
  var fileReference = req.params.resourceId;
  storage.getFileDetails(fileReference, function(err, found) {
    var response = {};
    if (err) {
      logger.error("Cannot get data", {err: err});
      res.status(404);
      response.message = err;
    } else {
      response.host = found.host;
    }
    res.json(response);
  });
});

module.exports = router;

