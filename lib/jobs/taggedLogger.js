function _log(logger, logMethod, tag, message, data) {
  if (data) {
    logMethod.call(logger, '%s %s ', tag, message, data);
  } else {
    logMethod.call(logger, '%s %s', tag, message);
  }
}

function TaggedLogger(rootLogger, tag) {

  this.logger = rootLogger;
  this.tag = tag;

  this.fatal = function(message, data) {
    _log(this.logger, this.logger.fatal, this.tag, message, data);
  };

  this.error = function(message, data) {
    _log(this.logger, this.logger.error, this.tag, message, data);
  };

  this.warn = function(message, data) {
    _log(this.logger, this.logger.warn, this.tag, message, data);
  };

  this.info = function(message, data) {
    _log(this.logger, this.logger.info, this.tag, message, data);
  };

  this.trace = function(message, data) {
    _log(this.logger, this.logger.trace, this.tag, message, data);
  };

  this.debug = function(message, data) {
    _log(this.logger, this.logger.debug, this.tag, message, data);
  };
}

module.exports.TaggedLogger = TaggedLogger;