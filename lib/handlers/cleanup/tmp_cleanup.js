"use strict";

const CleanupStatus = require('../../models').CleanupStatus
  , logger = require('../../util/logger').getLogger();

const IN_PROGRESS = "in progress";

/**
 * Creates a new tmp directory cleanup job
 *
 * @param req Http request
 * @param callback Callback
 */
function createNewTmpCleanupJob(req, callback) {
  let numNodes = req.body.numNodes;
  logger.info(`creating new tmp cleanup job for ${numNodes} nodes`);

  let model = new CleanupStatus({
    nodes: numNodes,
    runList: []
  });

  model.save(callback);
}

/**
 * Checks if a cleanup job already exists and returns its
 * status
 *
 * @param req Http request
 * @param callback Callback
 */
function runTmpCleanup(req, callback) {
  CleanupStatus.find().then(status => {
    if (!status || status.length === 0) {
      return createNewTmpCleanupJob(req, callback);
    } else {
      logger.info("cleanup is already in progress");
      return callback(null, {
        status: IN_PROGRESS
      });
    }
  }).catch(callback);
}

module.exports = (req, res) => {
  return runTmpCleanup(req, (err, result) => {
    if (err) {
      logger.error(err);
      return res.status(500).send(err);
    } else {
      return res.status(200).send(result);
    }
  });
};