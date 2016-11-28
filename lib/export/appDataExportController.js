var logger = require('../util/logger').getLogger();
var models = require('fh-mbaas-middleware').models;
var async = require('async');

var AppdataJobSchema = require('../models/AppdataJobSchema');
var JOB_TYPES = require('../models/BaseImportExportJobSchema').types;
var AppdataJob = require('../models').AppdataJob;

var status = AppdataJobSchema.statuses;
/**
 * Checks that required parameters are passed om
 * @param params the parameters
 * @returns {*} The error message or null if no errors
 */
function validateParams(params) {
  if (!params.domain) {
    return 'No domain specified';
  }
  if (!params.environment) {
    return 'No environment specified';
  }
  if (!params.appid) {
    return 'No app guid specified';
  }

  return null;
}

function createExportJob(params, cb) {
  var job = new AppdataJob();
  job.jobType = AppdataJobSchema.types.EXPORT;
  job.domain = params.domain;
  job.environment = params.environment;
  job.appid = params.appid;
  job.metadata = {
    fileSize: 0,
    fileDeleted: null,
    filePath: null,
    fileId: null,

    // Store the value here so that we can stop the app when
    // the job gets actually started
    stopApp: params.stopApp
  };

  job.save(function(err) {
    return cb(err, job);
  });
}

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

module.exports = {
  startExport: function(params, callback) {
    logger.info('Got export request', params);
    var valid_error = validateParams(params);
    if (valid_error) {
      logger.info('Parameter validation failed', valid_error);
      return callback({code: 400, message: valid_error});
    }
    var appId = params.appid;
    var env = params.environment;

    async.waterfall([
      async.apply(checkAppExists, appId, env),
      async.apply(AppdataJob.findOne.bind(AppdataJob), {
        jobType: JOB_TYPES.EXPORT,
        appid: appId,
        status: {
          $in: [status.QUEUED, status.INPROGRESS]
        }
      })
    ], function(err, task) {
      if (err) {
        logger.error('[APPDATAEXPORT] Error searching existing tasks', err);
        return callback(err);
      }

      logger.debug('task : ' + task);

      if (task) {
        logger.warn('[%s] export is already in progress', appId);
        return callback({code: 409, message: 'Export already in progress'});
      }

      logger.debug('[%s] Creating export task db model', appId, params);
      createExportJob(params, function(err, task) {
        if (err) {
          logger.error('[APPDATAEXPORT] Error creating task', err);
          return callback(err);
        }
        logger.debug('[%s] model saved. Run agenda task now', appId);

        logger.debug('[%s] export task created. jobId = %s', appId, task._id.toString());
        return callback(null, task.toJSON());
      });
    });
  }
};
