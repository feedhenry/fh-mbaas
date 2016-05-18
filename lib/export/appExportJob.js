var models = require('fh-mbaas-middleware').models;
var mongoose = require('mongoose');
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var async = require('async');

var AppDataExportRunner = require('./AppDataExportRunner').AppExportRunner;

var ExportJob = require('../models').ExportJob;
var ProgressPersistor = require('../jobs/progressPersistor').ProgressPersistor;

//in milliseconds. Lock the job for 2 minutes. If the job is running, it should renew the job every 30 seconds
const DEFAULT_LOCK_LIFETIME =  fhconfig.value('fhmbaas.appdataexport.default_lock_lifetime');
//in milliseconds. Should be bigger than the lock lifetime to make sure the job is unlocked.
//If the job is running, it should delay the schedule every 30 seconds
const SCHEDULE_TIME = fhconfig.value('fhmbaas.appdataexport.schedule_time');
const JOB_NAME = 'appExport';

const FAIL_EVENT = require('../jobs/progressPersistor').FAIL_EVENT;
const FINISH_EVENT = require('../jobs/progressPersistor').FINISH_EVENT;
const HEARTBEAT_EVENT = require('./AppDataExportRunner').HEARTBEAT_EVENT;

const OUTPUT_DIR = fhconfig.value('fhmbaas.appdataexport.output_dir');

function createContext(appInfo, exportJob, jobID, outputDir) {
  var context = {
    appInfo: appInfo,
    exportJob: exportJob,
    jobID: jobID,
    outputDir: outputDir,
    _logger: logger.child({job: jobID, appInfo: {appGuid: appInfo.guid, name: appInfo.name} }),
    logger: {
      _log: function(logMethod, message, data) {
        if (data) {
          logMethod.call(context._logger, '[APPDATAEXPORT] ' + message, data);
        } else {
          logMethod.call(context._logger, '[APPDATAEXPORT] ' + message);
        }
      },
      fatal: function (message, data) {
        this._log(context._logger.fatal, message, data);
      },
      error: function (message, data) {
        this._log(context._logger.error, message, data);
      },
      warn: function (message, data) {
        this._log(context._logger.warn, message, data);
      },
      info: function (message, data) {
        this._log(context._logger.info, message, data);
      },
      trace: function (message, data) {
        this._log(context._logger.trace, message, data);
      },
      debug: function (message, data) {
        this._log(context._logger.debug, message, data);
      }
    }
  };

  return context;
}

module.exports = function(agenda) {

  logger.info ('defining agenda job', DEFAULT_LOCK_LIFETIME, SCHEDULE_TIME);

  agenda.define(JOB_NAME, {lockLifetime: DEFAULT_LOCK_LIFETIME}, function(job, done) {
    var jobId = job.attrs.data.jobId;
    var appGuid = job.attrs.data.appGuid;
    var env = job.attrs.data.env;
    logger.info('[APPDATAEXPORT] Start running job', {jobId: jobId});

    //schedule another run in case this one is failed
    scheduleNextRun(job, new Date(Date.now() + SCHEDULE_TIME));

    var AppMbaasModel = models.getModels().AppMbaas;

    async.waterfall([
      async.apply(AppMbaasModel.findOne.bind(AppMbaasModel), {guid: appGuid, environment: env}),
      function (appData, cb) {

        if (!appData) {
          return cb('No application found with guid[' + appGuid + '] and environment [' + env + ']');
        }

        ExportJob.findById(jobId, function(err, exportJob) {
          return cb(err, appData, exportJob);
        });
      }
    ], function (err, appData, exportJob) {

      var context = createContext(appData, exportJob, jobId, OUTPUT_DIR);
      var runner = new AppDataExportRunner(context);

      // Persist the progress of the runner
      new ProgressPersistor(context.logger).listen(runner, exportJob, function(err) {
        if (err) {
          logger.error('[APPDATAEXPORT] Error persisting progress', err);
        }
      });

      runner.on(FAIL_EVENT, function(message) {
        logger.error('[APPDATAEXPORT] Job failed. Disabling to prevent future executions', {message : message});
        disableJob(job, function(err) {
          if (err) {
            logger.error('[APPDATAEXPORT] Error disabling job', {err: err});
          }
          return done(err);
        });
      });

      runner.on(FINISH_EVENT, function(message) {
        logger.info('[APPDATAEXPORT] Job finished. Disabling to prevent future executions', {message : message});
        disableJob(job, function(err) {
          if (err) {
            logger.error('[APPDATAEXPORT] Error disabling job', {err: err});
          }
          return done();
        });
      });
      runner.on(HEARTBEAT_EVENT, function() {
        //renew the lock

        logger.info('[APPDATAEXPORT] Heartbeat received', {jobId: jobId});

        job.touch(function() {
          logger.debug('[%s] job touched', appGuid);
        });
        //since current job is still running, push the schedule further
        scheduleNextRun(job, new Date(Date.now() + SCHEDULE_TIME));
      });

      runner.run();
    });
  });
};

function scheduleNextRun(job, when, cb) {
  job.schedule(when);
  job.save(cb);
}

function disableJob(job, cb) {
  job.disable();
  job.save(cb);
}