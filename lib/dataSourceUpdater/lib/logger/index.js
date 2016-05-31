var log = {};

module.exports = {
  setLogger: function(logger) {
    log.logger = logger;
  },
  getLogger: function() {
    return log;
  }
};