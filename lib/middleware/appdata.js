var ExportJob = require('../models').ExportJob;
var ExportJobSchema = require('../models/ExportJobSchema');
var storage = require('../../lib/storage');
var appExportController = require('../export/appExportController');
var logger = require('fh-config').getLogger();

exports.findJob = function(req, res, next, jobId) {
  ExportJob.findById(jobId, function(err, job) {
    if (err) {
      err = new Error();
      err.message = "Job not found";
      err.code = 404;
      return next(err);
    }

    req.job = job;
    return next();
  });
};

exports.allJobs = function(req, res, next) {
  ExportJob.find(function(err, jobs) {
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
  if (req.job.status !== ExportJobSchema.statuses.FINISHED) {
    error = new Error('Job still not finished. Current state: ' + req.job.status);
    error.code = 400;
    return next(error);
  }
  if (!req.job.fileId) {
    error = new Error('Job has no registered file');
    error.code = 400;
    return next(error);
  }
  if (req.job.fileDeleted) {
    error = new Error('File for this job has already been deleted');
    error.code = 410; // HTTP Gone
    return next(error);
  }
  next();
};

exports.generateURL = function(req, res, next) {
  // 0 defaults to the token duration in the config
  // might want to add a way for client override
  storage.generateURL(req.job.fileId, 0, function(err, url) {
    if (err) {
      logger.error("Error generating url", err);
      err.code = 500;
      return next(err);
    }
    req.fileUrl = url;
    return next();
  });
};