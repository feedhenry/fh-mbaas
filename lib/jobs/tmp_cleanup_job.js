"use strict";

const CleanupStatus = require('../models').CleanupStatus
  , logger = require('../util/logger').getLogger()
  , spawn = require('child_process').spawn
  , async = require('async')
  , fs = require('fs')
  , path = require('path')
  , os = require('os');

// Check for new cleanup jobs every 60 seconds
const SCHEDULE = "60 seconds";
const JOB_NAME = "tmp cleanup";
const HOSTNAME = os.hostname();
const TMP_DIR = os.tmpdir();

// If all nodes haven't finished after 5 minutes we give
// up on the job
const JOB_MAXAGE_SECONDS = 5 * 60;

/**
 * Check when the cleanup job was modified for the last time and report
 * back stale status after a certain time
 *
 * @param job Agenda job
 * @returns {boolean}
 */
function cleanupJobStale(job) {
  let now = new Date().getTime();
  let lastModified = now - job.modified.getTime();
  return lastModified > (JOB_MAXAGE_SECONDS * 1000);
}

/**
 * Try to delete all files and directories in the temp ddirectory.
 * Some of the operations will fail because of user permissions.
 * We just ignore those cases and try to delete what we can.
 *
 * @param job Agenda job
 * @param done Done callback
 */
function deleteFiles(job, done) {
  fs.readdir(TMP_DIR, (err, files) => {
    if (err) {
      logger.error({err}, `error listing ${TMP_DIR}`);
      return done();
    }

    // Don't use async here: some of the files will fail due to
    // permission issues. We ignore this. Just fire off all the
    // rm processes and delete what you can.
    files.forEach(file => {
      let filePath = path.join(TMP_DIR, file);

      // This should be safe: rm will not follow symlinks and by default
      // preserve root
      spawn('rm', ['-rf', filePath]);
    });

    // Make it known to the scheduler that this node has finished the cleanup
    // job and decreaste the number of pending nodes by 1
    job.runList.push(HOSTNAME);
    job.nodes = job.nodes - 1;

    logger.info(`temp files cleared on ${HOSTNAME}. Reducing nodes to ${job.nodes}`);

    job.save((err) => {
      if (err) {
        logger.error({err}, "error updating cleanup status");
      }
      return done(null);
    });
  });
}

/**
 * Check the current cleanup job status and proceed accordingly:
 * 1) job#nodes <= 0: The job has been finished on all nodes. We can
 *    just delete it.
 *
 * 2) job#runList contains hostname: The job has been finished on this
 *    node but is still pending on other nodes. Do nothing.
 *
 * 3) otherwise we need to run the tmp cleanup, put our hostname in
 *    runList and decrease job#nodes by one.
 *
 * @param done Done callback
 */
function performTmpCleanup(done) {
  CleanupStatus.find((err, status) => {
    if (err) {
      logger.error(err);
      return done();
    }

    if (status && status.length === 1) {
      let job = status[0];

      // Just delete stale jobs: we might be the reason why they are stale, so
      // don't attempt anything, just get rid of it
      if (cleanupJobStale(job)) {
        logger.info(`Cleanup job exceeded the max age of ${JOB_MAXAGE_SECONDS} seconds`);
        return job.remove(done);
      }

      if (job.nodes <= 0) {
        logger.info("all nodes have finished cleanup. Removing job");
        job.remove(err => {
          if (err) {
            logger.error(err);
          }

          return done();
        });
      } else if (job.runList.indexOf(HOSTNAME) >= 0) {
        logger.info("tmp cleanup already completed on this node");
        return done();
      } else {
        logger.info(`performing temp cleanup on ${HOSTNAME}`);
        return deleteFiles(job, done);
      }
    } else {
      logger.info("no cleanup jobs found");
      return done();
    }
  });
}

module.exports = (agenda) => {
  agenda.define(JOB_NAME, (job, done) => {
    performTmpCleanup(done);
  });

  agenda.every(SCHEDULE, JOB_NAME);
  logger.info(`tmp cleanup job running every ${SCHEDULE}`);
};