var logger = require('../util/logger').getLogger();
var AppdataJob = require('../models').AppdataJob;
var async = require('async');

const JOB_NAME = "appDataStalledJobsFinder";
const DEFAULT_LOCK_LIFETIME = 1*60*1000;
const DEFAULT_HEARTBEAT_INTERVAL = 30*1000;
const DEFAULT_STALLED_JOB_FINDER_FREQUENCY = '1 minute';

/**
 * Find stalled jobs and mark them as failed
 * @param  {int}   heartBeat the heartbeat frequency of the job (milliseconds)
 * @param  {Function} cb
 */
function failStalledJobs(heartBeat, cb) {
  logger.info('looking for stalled jobs', {heartbeat: heartBeat});
  AppdataJob.stalledJobs(heartBeat, function(err, jobs) {
    if (err) {
      logger.error('failed to find stalled jobs', {err:err});
      return cb(err);
    }

    if (jobs.length === 0) {
      logger.info('no stalled jobs found');
      return cb();
    }

    logger.info('found stalled jobs', {number_of_jobs: jobs.length});
    async.each(jobs, function(job, callback) {
      job.fail('timed out', callback);
    }, function(err) {
      if (err) {
        logger.error('failed to update stalled job', {err: err});
      } else {
        logger.info('stalled jobs status updated');
      }
      return cb(err);
    });
  });
}

/**
 * Define the repeatable job that will find stalled jobs and mark them failed
 * @param  {object} agenda the agenda module
 * @param  {object} opts
 * @param  {int} opts.lock_time lock time on the job to prevent multiple worker running the same job (milliseconds)
 * @param  {int} opts.heartbeat how often each job should update its db entry to show it's alive (milliseconds)
 *                              It should be the same as the heartbeat value defined for the appDataRunnerJob
 * @param  {int} opts.frequency how often the job should run to find stalled jobs
 */
module.exports = function(agenda, opts) {
  opts = opts || {};
  var lockTime = opts.lock_time || DEFAULT_LOCK_LIFETIME;
  var heartBeat = opts.heartbeat || DEFAULT_HEARTBEAT_INTERVAL;
  var frequency = opts.frequency || DEFAULT_STALLED_JOB_FINDER_FREQUENCY;
  logger.info('defining agenda data job', {jobName: JOB_NAME, frequency: frequency, lockTime: DEFAULT_LOCK_LIFETIME});

  agenda.define(JOB_NAME, {lockLifetime: lockTime}, function(job, done) {

    failStalledJobs(heartBeat, function(err) {
      if (err) {
        logger.error('Error occured when run app data job', {err: err});
      }
      return done(err);
    });
  });

  agenda.every(frequency, JOB_NAME);
};

module.exports.JOB_NAME = JOB_NAME;