var AppdataJob = require('../models').AppdataJob;
var AppdataJobSchema = require('../models/AppdataJobSchema');
var storage = require('../../lib/storage');
var appExportController = require('../export/appDataExportController');
var logger = require('fh-config').getLogger();
var mongoose = require('mongoose');

function createErrorObject(code, message) {
  var err = new Error();
  err.message = message;
  err.code = code;
  return err;
}

exports.findJob = function(req, res, next, jobId) {

  if (!jobId || ('ObjectID' !== jobId.constructor.name && !mongoose.Types.ObjectId.isValid(jobId))) {
    return next(createErrorObject(404, "Job not found"));
  }

  AppdataJob.findById(jobId, function(err, job) {
    if (err) {
      return next(createErrorObject(500, "Error retrieving job"));
    }

    if (!job) {
      return next(createErrorObject(404, "Job not found"));
    }
    req.job = job;
    return next();
  });
};

exports.allJobs = function(req, res, next) {
  AppdataJob.find({jobType: AppdataJobSchema.types.EXPORT}, function(err, jobs) {
    if (err) {
      err.code = 500;
      return next(err);
    }
    req.jobs = jobs;
    return next();
  });
};


exports.createJob = function(req, res, next) {
  appExportController.startExport(req.params, function(err, job) {
    if (err) {
      logger.error("Cannot trigger export.", {err: err});
      return next(err);
    }
    req.job = job;
    next();
  });
};

exports.ensureJobFinishedAndRegistered = function(req, res, next) {
  var error;
  if (req.job.status !== AppdataJobSchema.statuses.FINISHED) {
    error = new Error('Job still not finished. Current state: ' + req.job.status);
    error.code = 400;
    return next(error);
  }

  if (!req.job.metadata || !req.job.metadata.fileId) {
    error = new Error('Job has no registered file');
    error.code = 400;
    return next(error);
  }
  if (!req.job.metadata || req.job.metadata.fileDeleted) {
    error = new Error('File for this job has already been deleted');
    // HTTP Gone
    error.code = 410;
    return next(error);
  }
  next();
};

exports.generateURL = function(req, res, next) {
  // 0 defaults to the token duration in the config
  // might want to add a way for client override
  storage.generateURL(req.job.metadata.fileId, 0, function(err, url) {
    if (err) {
      logger.error("Error generating url", err);
      err.code = 500;
      return next(err);
    }
    req.fileUrl = url;
    return next();
  });
};