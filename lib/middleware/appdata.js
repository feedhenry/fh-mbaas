var ExportJob = require('../models').ExportJob;
var path = require('path');
var storage = require('../../lib/storage');

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
  var job = new ExportJob();
  job.domain = req.params.domain;
  job.environment = req.params.environment;
  job.appid = req.params.appid;
  job.save(function(err) {
    if (err) {
      if (err.name === 'ValidationError') {
        err.code = 400;
      } else {
        err.code = 500;
      }
      return next(err);
    }
    req.job = job;
    return next();
  });
};

exports.registerFile = function(req, res, next) {
  // TODO: job's filePath should come from runner
  var filePath = path.resolve(__dirname, '../../README.md');
  req.job.filePath = filePath;

  if (req.job.fileDeleted) {
    var err = new Error('File deleted');
    err.code = 404;
    return next(err);
  }

  getFileId(req.job, function(err, fileId) {
    if (err) {
      err.code = 500;
      return next(err);
    }
    req.fileId = fileId;
    return next();
  });
};


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

exports.generateURL = function(req, res, next) {
  storage.generateURL(req.fileId, 0, function(err, url) {
    if (err) {
      err.code = 500;
      return next(err);
    }
    req.fileUrl = url;
    return next();
  });
};