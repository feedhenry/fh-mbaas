var handlers = require('./lib/handlers');
var log = require('./lib/logger');

module.exports = function(logger) {
  log.setLogger(logger);

  return {
    handlers: handlers
  };
};