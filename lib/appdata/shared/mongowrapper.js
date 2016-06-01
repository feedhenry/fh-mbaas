const Restore = require('../shared/restoreCommand').Restore;

/**
 * Wrapper object for mongodump/mongorestore commands
 * @param host mongo host
 * @param port mongo port
 * @param username mong username
 * @param password mongo password
 * @constructor
 */
function MongoWrapper(host, port, username, password) {
  this.host = host;
  this.port = port;
  this.username = username;
  this.password = password;
}

/**
 * To be invoked to obtain an instance of the restore handler.
 * That instance must be configured through the fluent API.
 */
MongoWrapper.prototype.restore = function() {
  return new Restore()
    .withHost(this.host)
    .withPort(this.port);
};

module.exports.MongoWrapper = MongoWrapper;
