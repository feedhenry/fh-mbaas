"use strict";

var logger = require('../util/logger').getLogger();
var models = require('fh-mbaas-middleware').models;
var async = require('async');

var AppdataJobSchema = require('../models/AppdataJobSchema');
var AppdataJob = require('../models/index').AppdataJob;

var status = AppdataJobSchema.statuses;

function checkAppExists(appId, env, cb) {
  var AppMbaasModel = models.getModels().AppMbaas;
  AppMbaasModel.findOne({guid: appId, environment: env}, function(err, app) {
    if (err) {
      return cb(err);
    }

    if (!app) {
      return cb('No application with id "' + appId + '" could be found');
    } else {
      return cb();
    }
  });
}

function createImportJob(params, cb) {
  var job = new AppdataJob();
  job.jobType = AppdataJobSchema.types.IMPORT;
  job.domain = params.domain;
  job.environment = params.environment;
  job.appid = params.appid;
  job.metadata = {
    fileSize: params.filesize,
    filePath: params.filepath,
    fileId: params.fileId,
    uploadFinished: false
  };

  job.save(function(err) {
    return cb(err, job);
  });
}

exports.startImportJob = function(params, callback) {
  var appId = params.appid;
  var env = params.environment;

  async.waterfall([
    async.apply(checkAppExists, appId, env),
    async.apply(AppdataJob.findOne.bind(AppdataJob), {
      appid: appId,
      status: {
        $in: [status.QUEUED, status.INPROGRESS]
      }
    })
  ], function(err, task) {
    if (err) {
      logger.error('[APPDATAIMPORT] Error searching existing tasks', err);
      return callback(err);
    }

    if (task) {
      logger.warn('[%s] import is already in progress', appId);
      return callback({code: 409, message: 'created'});
    }

    logger.debug('[%s] Creating import task db model', appId, params);
    createImportJob(params, function(err, task) {
      if (err) {
        logger.error('[APPDATAIMPORT] Error creating task', err);
        return callback(err);
      }

      return callback(null, task);
    });
  });
};