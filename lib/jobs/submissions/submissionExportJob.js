var fhconfig = require('fh-config');
var logger = require('../../util/logger').getLogger();
var async = require('async');
var SubmissionExportRunner = require('../../export/submissions/SubmissionExportRunner').SubmissionExportRunner;

var SubmissionExportJob = require('../../models').SubmissionExportJob;
var ProgressPersistor = require('../progressPersistor').ProgressPersistor;

//in milliseconds. Lock the job for 2 minutes. If the job is running, it should renew the job every 30 seconds
const DEFAULT_LOCK_LIFETIME =  fhconfig.value('fhmbaas.appdataexport.default_lock_lifetime');
//in milliseconds. Should be bigger than the lock lifetime to make sure the job is unlocked.
//If the job is running, it should delay the schedule every 30 seconds
const SCHEDULE_TIME = fhconfig.value('fhmbaas.appdataexport.schedule_time');
const JOB_NAME = 'submissionExport';

var CONSTANTS = require('../../export/constants');

const FAIL_EVENT = ProgressPersistor.FAIL_EVENT;
const FINISH_EVENT = ProgressPersistor.FINISH_EVENT;
const HEARTBEAT_EVENT = CONSTANTS.HEARTBEAT_EVENT;

const OUTPUT_DIR = fhconfig.value('fhmbaas.appdataexport.output_dir');

const LOG_TAG = '[SUBMISSIONEXPORT]';

function createContext(exportJob, jobID, outputDir) {
  var TaggedLogger = require('./taggedLogger').TaggedLogger;
  return {
    exportJob: exportJob,
    jobID: jobID,
    outputDir: outputDir,
    logger : new TaggedLogger(logger.child({job: jobID }), LOG_TAG)
  };
}

module.exports = function(agenda) {

  logger.info('defining agenda job', DEFAULT_LOCK_LIFETIME, SCHEDULE_TIME);

  agenda.define(JOB_NAME, {lockLifetime: DEFAULT_LOCK_LIFETIME}, function(job, done) {
    var jobId = job.attrs.data.jobId;
    logger.info(LOG_TAG + ' Start running job', {jobId: jobId});

    //schedule another run in case this one is failed
    scheduleNextRun(job, new Date(Date.now() + SCHEDULE_TIME));

    async.waterfall([
      function(cb) {
        SubmissionExportJob.findById(jobId, function(err, exportJob) {
          return cb(err, exportJob);
        });
      }
    ], function(err, exportJob) {
      //if there is an error getting the job details, then a runner cannot be instantiated.
      if (err) {
        logger.warn(LOG_TAG + ' Error getting job details. Cannot run job with id ' + jobId, err);
        return;
      }

      var context = createContext(exportJob, jobId, OUTPUT_DIR);
      var runner = new SubmissionExportRunner(context);

      // Persist the progress of the runner
      new ProgressPersistor(context.logger).listen(runner, exportJob, function(err) {
        if (err) {
          logger.error(LOG_TAG + ' Error persisting progress', err);
        }
      });

      runner.on(FAIL_EVENT, function(message) {
        logger.error(LOG_TAG + ' Job failed. Disabling to prevent future executions', {message : message});
        disableJob(job, function(err) {
          if (err) {
            logger.error(LOG_TAG + ' Error disabling job', {err: err});
          }
          return done(err);
        });
      });

      runner.on(FINISH_EVENT, function(message) {
        logger.info(LOG_TAG + ' Job finished. Disabling to prevent future executions', {message : message});
        disableJob(job, function(err) {
          if (err) {
            logger.error(LOG_TAG + ' Error disabling job', {err: err});
          }
          return done();
        });
      });
      runner.on(HEARTBEAT_EVENT, function() {
        //renew the lock

        logger.info(LOG_TAG + ' Heartbeat received', {jobId: jobId});

        job.touch(function() {
          logger.debug('[%s] job touched');
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