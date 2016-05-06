var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var Agenda = require('fh-agenda');
var os = require('os');
var middleware = require('../middleware/appdata');

var ExportJobSchema = require('../models/ExportJobSchema');
var ExportJob = require('../models').ExportJob;
var constants = require('./constants');

var agenda;

function getAgendaInstance() {
  if (!agenda) {
    var mongoConn = fhconfig.mongoConnectionString('mongo');
    logger.debug('agenda mongo connection = ' + mongoConn);
    agenda = new Agenda({db: {address: mongoConn}});
    agenda.name('AppDataExportAgenda-' + os.hostname + '-' + process.pid);

    require('./appExportJob')(agenda);
    agenda.start();
  }
  return agenda;
}

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
    logger.debug('Got export request', params);
    var valid_error = validateParams(params);
    if (valid_error) {
      return callback({code: 400, message: valid_error});
    }
    var appId = params.appid;

    ExportJob.findOne({
      appid: appId,
      status: {
        $in: [constants.STATUS.QUEUED, constants.STATUS.INPROGRESS]
      }
    }, function(err, task) {
      if (err) {
        logger.error('Error searching existing tasks', err);
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
          return callback(err);
        }
        logger.debug('[%s] model saved. Run agenda task now', appId);
        getAgendaInstance().now('appExport', {jobId: task._id.toString(), appGuid: appId});
        logger.debug('[%s] export task created. jobId = %s', appId, task._id.toString());
        return callback(null, task.toJSON());
      });
    });
  }
};