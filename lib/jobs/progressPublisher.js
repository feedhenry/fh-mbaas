
const STATUS_EVENT = 'status';
const START_EVENT = 'start';
const PROGRESS_EVENT = 'progress';
const FAIL_EVENT = 'fail';
const FINISH_EVENT = 'finish';

const DEFAULT_QUEUE_SIZE = 10;
/**
 * The MessageQueue object is used to save the received message until a certain queue
 * size is reached.
 *
 * @param queueSize the size of the queue
 * @constructor
 */
function MessageQueue(queueSize) {
  this.queue_size = queueSize ? queueSize : DEFAULT_QUEUE_SIZE;
  this.messages = [];

  this.isFull = function() {
    return this.messages.length >= this.queue_size;
  };

  this.push = function(message) {
    this.messages.push(message);
    return this.isFull();
  };

  // Empties the basked and returns the removed messages
  this.empty = function() {
    var oldMessages = this.messages;
    this.messages = [];
    return oldMessages;
  };
}

/**
 * The publisher object has the role of receiving the messages from the emitter and publish them using a
 * custom publisher.
 * All the received message will get queued until a FINISH_EVENT or FAIL_EVENT is received or a specified queue size
 * is reached.
 * @param emitter the event emitter
 * @param publisher the publisher function to be used to publish the messages. It will receive the message to be
 * published as parameter in the format of:
 *   { type: MESSAGE_TYPE,
 *     data: MESSAGE_CONTENT
 *   }
 * where MESSAGE_TYPE will be one of:
 *   - STATUS_EVENT
 *   - PROGRESS_EVENT
 *   - FAIL_EVENT
 *   - FINISH_EVENT
 * If a FAIL_EVENT or a FINISH_EVENT is received, the messages in the queue gets flushed automatically.
 * @param queueSize the size of the queue to be used to 'batch' the message publishing
 * @constructor
 */
function ProgressPublisher(queueSize, publisher) {

  this.publisher = publisher;

  this.publishMessages = function(messageQueue, publisher, flush) {
    if (flush || messageQueue.isFull()) {
      publisher(messageQueue.empty());
    }
  };

  this.messageQueue = new MessageQueue(queueSize);
}

ProgressPublisher.prototype.listen = function(emitter) {
  this.evtEmitter = emitter;

  var self = this;

  self.evtEmitter.on(STATUS_EVENT, function(status) {
    self.messageQueue.push({type: STATUS_EVENT, data: status});
    self.publishMessages(self.messageQueue, self.publisher);
  });

  self.evtEmitter.on(START_EVENT, function(message) {
    self.messageQueue.push({type: START_EVENT, data: message});
    self.publishMessages(self.messageQueue, self.publisher);
  });

  self.evtEmitter.on(PROGRESS_EVENT, function(progress, current, total) {
    self.messageQueue.push({type: PROGRESS_EVENT, data: progress, current: current, total: total});
    self.publishMessages(self.messageQueue, self.publisher);
  });

  self.evtEmitter.on(FINISH_EVENT, function(message) {
    self.messageQueue.push({type: FINISH_EVENT, data: message});
    // flush all the messages
    self.publishMessages(self.messageQueue, self.publisher, true);
  });

  self.evtEmitter.on(FAIL_EVENT, function(message) {
    self.messageQueue.push({type: FAIL_EVENT, data: message});
    // flush all the messages
    self.publishMessages(self.messageQueue, self.publisher, true);
  });
};

module.exports.ProgressPublisher = ProgressPublisher;

module.exports.STATUS_EVENT = STATUS_EVENT;
module.exports.START_EVENT = START_EVENT;
module.exports.PROGRESS_EVENT = PROGRESS_EVENT;
module.exports.FAIL_EVENT = FAIL_EVENT;
module.exports.FINISH_EVENT = FINISH_EVENT;