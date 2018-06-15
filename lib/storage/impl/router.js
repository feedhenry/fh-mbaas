var express = require('express');
var config = require('fh-config');
var logger = require('../../util/logger').getLogger();
var storage = require("..");
var multer = require('multer');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var os = require('os');

var AppdataJob = require('../../models').AppdataJob;

const UPLOAD_PATH = config.value("fhmbaas.appdata_jobs.upload_dir");

var storage = multer.diskStorage({
  dest: UPLOAD_PATH,
  destination: function(dest, file, req) {
    var domain = req.params.domain
      , jobid = req.params.jobId
      , appid = req.params.appid
      , env = req.params.env
      , newDest = path.join(dest, domain, env, appid, jobid);

    // Need to use sync method here because the `changeDest` function
    // of multer is not async. Also `mkdirp.sync` does not return
    // any useful information in case of error. So we have to trust
    // the underlying node fh functions to throw in case of error.
    try {
      mkdirp.sync(newDest);
    } catch (e) {
      logger.error("Error creating upload dir", e);
      // Don't continue
      throw e;
    }

    // Success. Save the full upload path in the request for
    // later usage
    logger.info("Uploading file to " + newDest);
    req.params.fullUploadPath = newDest;
    cb(null, newDest);
  }
});

var upload = multer({storage: storage}).any();

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
   * Inject appid, domain and environment from the job into the request
   * because that information is needed to create the correct upload
   * path
   */
  function injectDetails(done) {
    async.waterfall([
      async.apply(AppdataJob.findById.bind(AppdataJob), jobId),
      function(job, cb) {
        if (!job) {
          return cb(new Error("Job with id " + jobId + " could not be found"));
        }

        req.params.appid = job.appid;
        req.params.domain = job.domain;
        req.params.env = job.environment;
        cb();
      }
    ], done);
  }

  /**
   * If the upload fails for whatever reason (connection lost,
   * out-of disk space) we have to mark the job as failed.
   * @param reason Fail reason. String or exception object.
   */
  function failJob(reason, done) {
    async.waterfall([
      async.apply(AppdataJob.findById.bind(AppdataJob), jobId),
      function(job, cb) {
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
  function commitJob(done) {
    if (!req.params.fullUploadPath) {
      return done(new Error("Upload path could not be created"));
    }

    async.waterfall([
      async.apply(AppdataJob.findById.bind(AppdataJob), jobId),
      function(job, cb) {
        var fileNamePath = path.join(req.params.fullUploadPath, req.files.file.name);
        // Set the actual file name after the file is stored
        // on disk (different to the original file name)
        job.updateMetadata("filePath", fileNamePath);

        // To tell the scheduler that the job can be started
        job.updateMetadata("uploadFinished", true);

        // Store the hostnme where this was uploaded so that the correct
        // scheduler can pick this one up. This is to make sure that import
        // also works in setups without a shared location
        job.updateMetadata("shipHostname", os.hostname());

        job.save(cb);
      }
    ], done);
  }

  // Upload
  async.waterfall([
    // Inject appid, env and domain
    injectDetails,

    // Check if the transmitted file id and token are valid
    async.apply(storage.checkToken, fileReference, tokenId),

    // Process the actual upload
    function(file, callback) {
      upload(req, res, callback);
    },

    commitJob
  ], function(err, result) {
    if (err) {
      return failJob(err, function() {
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

