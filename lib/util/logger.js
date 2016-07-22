var _ = require('underscore');
var fh_logger = require('fh-logger');
var logger;

function setLogger(logr) {
  logger = logr;
}

// If logger hasn't been previously set (which can happen in the tests for example),
// default to a very basic bunyan logger.
// If the tests need a better logger they can create on in setUp as required..
function getLogger() {
  if (logger) {
    return logger;
  }

  logger = fh_logger.createLogger({
    name: 'test-fh-mbaas',
    streams: [
      {
        "type": "stream",
        "level": "error",
        "stream": "process.stdout"
      }
    ]
  });
  return logger;
}

module.exports = {
  getLogger: getLogger,
  setLogger: setLogger
};
