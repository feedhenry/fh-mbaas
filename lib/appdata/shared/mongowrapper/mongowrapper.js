const Restore = require('./restoreCommand').Restore;

/**
 * Wrapper object for mongodump/mongorestore commands
 * @constructor
 */
function MongoWrapper() {
}

/**
 * To be invoked to obtain an instance of the restore handler.
 * That instance must be configured through the fluent API.
 */
MongoWrapper.prototype.restore = function() {
  return new Restore();
};

module.exports.MongoWrapper = MongoWrapper;
