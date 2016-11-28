var storage = require('../../lib/storage');
var logger = require('../util/logger').getLogger();
var mongoose = require('mongoose');
var _ = require('underscore');
var jobStatuses = require('../models/BaseImportExportJobSchema').statuses;
function createErrorObject(code, message) {
  var err = new Error();
  err.message = message;
  err.code = code;
  return err;
}
/**
 * Creats CRUD middleware for a job export
 * @param  {Mongoose.model} model      Job model, should inherit from BaseImportExportJobSchema
 * @param  {Function(Object, Function(Error, Mongoose.model))} spawnFn Function to spawn a job runner,
 * will receive all request params and a node-style callback for a new model
 * @param  {Function(Request, Response, Next(Error))} filterFn Function to build a filter for the underlying collection
 * @return {Object}            An object containing the following express middleware:
 * - find: parameter middleware to read single job by id, populates `req.job`
 * - all: Return all jobs, populates `req.jobs`
 * - crate: invokes `spawnFn` to start a new job, and populates `req.job`
 */
module.exports = function(model, spawnFn, filterFn) {
  var middleware = {};

  middleware.find = function(req, res, next, jobId) {
    if (!jobId || ('ObjectID' !== jobId.constructor.name && !mongoose.Types.ObjectId.isValid(jobId))) {
      return next(createErrorObject(404, "Job not found"));
    }

    model.findById(jobId, function(err, job) {
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

  middleware.filteredJobs = function(req, res, next) {
    var filter = {};
    if (_.isFunction(filterFn)) {
      filter = filterFn(req, res, next);
    }
    model.find(filter, function(err, jobs) {
      if (err) {
        err.code = 500;
        return next(err);
      }
      req.jobs = jobs;
      return next();
    });
  };


  middleware.create = function(req, res, next) {
    spawnFn(req.params, function(err, job) {
      if (err) {
        logger.error("Cannot trigger export.", {err: err});
        return next(err);
      }
      req.job = job;
      next();
    });
  };

  middleware.ensureFinishedAndRegistered = function(req, res, next) {
    var error;
    if (req.job.status !== jobStatuses.FINISHED) {
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

  // Generates URLs for download and upload routes
  function generateStorageUrl(req, fileId, expires, jobId, next) {
    storage.generateURL(fileId, expires, jobId, function(err, url) {
      if (err) {
        logger.error("Error generating url", err);
        err.code = 500;
        return next(err);
      }
      req.fileUrl = url;
      return next();
    });

  }

  middleware.generateURL = function(req, res, next) {
    generateStorageUrl(req, req.job.metadata.fileId, null, 0, next);
  };

  // The upload URL requires the jobId in the route
  middleware.generateURLForUpload = function(req, res, next) {
    generateStorageUrl(req, req.job.metadata.fileId, req.job._id.toString(), 0, next);
  };

  return middleware;
};

module.exports.createErrorObject = createErrorObject;