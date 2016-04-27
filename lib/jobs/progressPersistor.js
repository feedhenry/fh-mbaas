var fhConfig = require('fh-config');
var logger = fhConfig.getLogger();
var util = require('util');
var ProgressPublisher = require('lib/jobs/progressPublisher').ProgressPublisher;

const STATUS_EVENT = require('lib/jobs/progressPublisher').STATUS_EVENT;
const PROGRESS_EVENT = require('lib/jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;

// Persist a change of status.
function persistStatusChange(progressModel, status, cb) {

  progressModel.set(STATUS_EVENT, status);

  progressModel.save(function(err){
    if(err){
      logger.error('Failed to update task model due to error ' + err, progressModel);
      return cb(err, status);
    }
  });
}

function persistProgressChange(progressModel, progress, cb) {
  progressModel.set(PROGRESS_EVENT, progress);

  progressModel.save(function(err){
    if(err){
      logger.error('Failed to update task model due to error ' + err, progressModel);
      return cb(err, progress);
    }
  });
}

function publish(model, message, cb) {
  // Dispatch each message to its persistor function
  switch (message.type) {
    case STATUS_EVENT:
      logger.debug('Persisting event', message);
      persistStatusChange(model, message.data, cb);
      return;
    case PROGRESS_EVENT:
      logger.debug('Persisting event', message);
      persistProgressChange(model, message.data, cb);
      return;
    default:
      return;
  }
}

/**
 * Persists the received events to the database using the passed in model
 *
 * @param emitter the object that will emit the events. Currently, the only saved events are:
 *   - STATUS_EVENT
 *   - PROGRESS_EVENT
 *   All the other events are ignored.
 * @param model the model to be used to persist the events
 * @param cb a callback to be called ONLY if an error occurres saving the events
 * @constructor
 */
function ProgressPersistor(emitter, model, cb) {

  // We reuse the publisher code to 'publish' the events on the database
  // Lets create a custom publisher
  this.publisherFunction = function(message) {
    publish(model, message[0], cb);
  };

  // We do not want to bake 'batch' update, so we persist each received message: basket size = 1
  this.progressPublisher = new ProgressPublisher(emitter, this.publisherFunction, 1);
}


module.exports.ProgressPersistor = ProgressPersistor;

module.exports.STATUS_EVENT = STATUS_EVENT;
module.exports.PROGRESS_EVENT = PROGRESS_EVENT;
module.exports.FAIL_EVENT = FAIL_EVENT;
module.exports.FINISH_EVENT = FINISH_EVENT;