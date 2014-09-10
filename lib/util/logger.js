var bunyan = require('bunyan');
var logger;
var ringBuffer;

function setLogger(logr) {
  logger = logr;
}

// If logger hasn't been previously set (which can happen in the tests for example),
// default to a very basic bunyan logger.
// If the tests need a better logger they can create on in setUp as required..
function getLogger() {
  if (logger) return logger;

  logger = bunyan.createLogger({
    name: 'basic-logger',
    level: 'trace',
    src: true
  });
  return logger;
}

// set Bunyan ring buffer
function setRingBuffer(rb) {
  ringBuffer = rb;
}

// get Bunyan ring buffer
function getRingBuffer() {
  return ringBuffer;
}

exports.setLogger = setLogger;
exports.getLogger = getLogger;
exports.setRingBuffer = setRingBuffer;
exports.getRingBuffer = getRingBuffer;