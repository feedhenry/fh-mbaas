var _logger = require('../util/logger').getLogger();
var ProgressPublisher = require('../jobs/progressPublisher').ProgressPublisher;

const STATUS_EVENT = require('../jobs/progressPublisher').STATUS_EVENT;
const START_EVENT = require('../jobs/progressPublisher').START_EVENT;
const PROGRESS_EVENT = require('../jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('../jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('../jobs/progressPublisher').FAIL_EVENT;

const STATUSES = require('../models/AppdataJobSchema').statuses;

// Persist a change of status.
function persistStatusChange(progressModel, status, cb) {
  var logger = this.logger;
  logger.info('UPDATING STATUS TO ', status);

  progressModel.set('status', status);

  progressModel.save(function(err) {
    if (err) {
      logger.error('Failed to update task model due to error ' + err, progressModel);
      return cb(err, status);
    }
  });
}

function persistProgressChange(progressModel, progress, current, total, cb) {
  var logger = this.logger;
  progressModel.set('progress', progress);
  progressModel.set('step', current);
  progressModel.set('totalSteps', total);


  progressModel.save(function(err) {
    if (err) {
      logger.error('Failed to update task model due to error ' + err, progressModel);
      return cb(err, progress);
    }
  });
}

function publish(model, message, cb) {
  var logger = this.logger;
  // Dispatch each message to its persistor function
  switch (message.type) {
  case STATUS_EVENT:
    logger.debug('Persisting event', message);
    persistStatusChange.call(this, model, message.data, cb);
    return;
  case START_EVENT:
    logger.debug('Persisting event', message);
    persistStatusChange.call(this, model, STATUSES.INPROGRESS, cb);
    return;
  case PROGRESS_EVENT:
    logger.debug('Persisting event', message);
    persistProgressChange.call(this, model, message.data, message.current, message.total, cb);
    return;
  case FINISH_EVENT:
    logger.debug('Persisting event', message);
    persistStatusChange.call(this, model, STATUSES.FINISHED, cb);
    return;
  case FAIL_EVENT:
    logger.debug('Persisting event', message);
    persistStatusChange.call(this, model, STATUSES.FAILED, cb);
    return;
  default:
    return;
  }
}

/**
 * Persists the received events to the database using the passed in model
 *
 * @param emitter the object that will emit the events. Currently, the only saved events are:
 *   - STATUS_EVENT. Expected params : status text
 *   - PROGRESS_EVENT. Expected params : progress messagge, current value, total value
 *   - FINISH_EVENT. No params expected
 *   - FAIL_EVENT. Expected params: the error message.
 *   All the other events are ignored.
 * @param model the model to be used to persist the events
 * @param cb a callback to be called ONLY if an error occurres saving the events
 * @constructor
 */
function ProgressPersistor(logger) {
  this.logger = logger ? logger: _logger;
}

ProgressPersistor.prototype.listen = function(emitter, model, cb) {
  var self = this;
  var logger = self.logger;

  // We reuse the publisher code to 'publish' the events on the database
  // Lets create a custom publisher
  this.publisherFunction = function(message) {
    logger.info('PUBLISHING', message);
    publish.call(self, model, message[0], cb);
  };

  // We do not want to make 'batch' update, so we persist each received message: queue size = 1
  this.progressPublisher = new ProgressPublisher(1, this.publisherFunction);
  this.progressPublisher.listen(emitter);

  return this;
};

module.exports.ProgressPersistor = ProgressPersistor;

module.exports.STATUS_EVENT = STATUS_EVENT;
module.exports.START_EVENT = START_EVENT;
module.exports.PROGRESS_EVENT = PROGRESS_EVENT;
module.exports.FAIL_EVENT = FAIL_EVENT;
module.exports.FINISH_EVENT = FINISH_EVENT;
