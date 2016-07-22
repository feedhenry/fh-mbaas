var logger = require('../util/logger').getLogger();
var AppdataJobModel = require('../models').AppdataJob;
var AppDataJob = require('./appDataJob');

const JOB_NAME = "appDataRunner";
const DEFAULT_LOCK_LIFETIME = 30*1000;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_HEARTBEAT_INTERVAL = 30*1000;
const DEFAULT_SCHEDULER_FREQUENCY = '30 seconds';

/**
 * Find the next job needs to run and run it.
 * @param  {int}   heartBeat   the heartbeat frequency of the job (milliseconds)
 * @param  {int}   concurrency how many jobs can run at the same time
 * @param  {Function} cb
 */
function runNextJob(heartBeat, concurrency, cb) {
  logger.info('looking for next app data job to run', {heartbeat: heartBeat, concurrency: concurrency});
  AppdataJobModel.runningJobs(heartBeat, function(err, runningJobs) {
    if (err) {
      logger.error('failed to find running jobs', {err: err});
      return cb(err);
    }

    logger.info('found running jobs', {runningJobs: runningJobs});

    if (runningJobs.length >= concurrency) {
      logger.info('data job concurrency limit reached', {concurrency: concurrency});
      return cb();
    } else {
      logger.info('data job concurrency is not reached');
    }

    AppdataJobModel.findNextJob(function(err, nextJob) {
      if (err) {
        logger.error('failed to find next job to run', {err: err});
        return cb(err);
      }

      if (!nextJob || nextJob.length === 0) {
        logger.info('no new job to run');
        return cb();
      }

      nextJob = nextJob[0];

      nextJob.checkCurrentState(function(err) {
        if (err) {
          logger.error('error occured when check job state', {err: err, job: nextJob});
        }
        var jobReady = nextJob.readyToProceed();
        if (jobReady) {
          process.nextTick(function() {
            AppDataJob.start(nextJob, heartBeat);
          });
        } else {
          logger.info('job is not ready. Skip it for now', {job: nextJob});
        }

        return cb();
      });
    });
  });
}

/**
 * Define the scheduler job that will run the app data jobs.
 * @param  {object} agenda the agenda module
 * @param  {object} opts
 * @param  {int} opts.lock_time lock time on the job to prevent multiple worker running the same job (milliseconds)
 * @param  {int} opts.concurrency how many jobs are allowed to run at the same time
 * @param  {int} opts.heartbeat how often each job should update its db entry to show it's alive (milliseconds)
 * @param  {int} opts.frequency how often the scheduler should run to look for next job
 */
module.exports = function(agenda, opts) {
  opts = opts || {};
  var lockTime = opts.lock_time || DEFAULT_LOCK_LIFETIME;
  var concurrency = opts.concurrency || DEFAULT_CONCURRENCY;
  var heartBeat = opts.heartbeat || DEFAULT_HEARTBEAT_INTERVAL;
  var frequency = opts.frequency || DEFAULT_SCHEDULER_FREQUENCY;

  logger.info('defining agenda data job', {jobName: JOB_NAME, frequency: frequency, lockTime: DEFAULT_LOCK_LIFETIME});

  agenda.define(JOB_NAME, {lockLifetime: lockTime}, function(job, done) {
    runNextJob(heartBeat, concurrency, function(err) {
      if (err) {
        logger.error('Error occured when run app data job', {err: err});
      }
      return done(err);
    });

  });

  agenda.every(frequency, JOB_NAME);
};

module.exports.JOB_NAME = JOB_NAME;