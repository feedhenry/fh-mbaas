var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var Agenda = require('fh-agenda');
var os = require('os');

var ExportJobSchema = require('../models/ExportJobSchema');
var ExportJob = require('../models').ExportJob;
var status = ExportJobSchema.statuses;

var agendaFactory = require('./agenda.js');

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
  var job = new ExportJob();
  job.domain = params.domain;
  job.environment = params.environment;
  job.appid = params.appid;
  job.save(function(err) {
    return cb(err, job);
  });
}

module.exports = {
  startExport: function (params, callback) {
    logger.info('Got export request', params);
    var valid_error = validateParams(params);
    if (valid_error) {
      logger.info ('Parameter validation failed', valid_error);
      return callback({code: 400, message: valid_error});
    }
    var appId = params.appid;
    var env = params.environment;

    ExportJob.findOne({
      appid: appId,
      status: {
        $in: [status.QUEUED, status.INPROGRESS]
      }
    }, function(err, task) {
      if (err) {
        logger.error('[APPDATAEXPORT] Error searching existing tasks', err);
        return callback(err);
      }

      logger.debug ('task : ' + task);

      if (task) {
        logger.warn('[%s] export is already in progress', appId);
        return callback({code: 409, message:'created'});
      }

      logger.debug('[%s] Creating export task db model', appId, params);
      //ExportJobSchema.createModel(params, function(err, task)
      createExportJob(params, function(err, task){
        if (err) {
          logger.error('[APPDATAEXPORT] Error creating task', err);
          return callback(err);
        }
        logger.debug('[%s] model saved. Run agenda task now', appId);

        var agenda = agendaFactory();

        agenda.now('appExport', {jobId: task._id.toString(), appGuid: appId, env: env});

        logger.debug('[%s] export task created. jobId = %s', appId, task._id.toString());
        return callback(null, task.toJSON());
      });
    });
  }
};