const Restore = require('./restoreCommand').Restore;
const Mongo = require('./mongoCommand').Mongo;

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

MongoWrapper.prototype.mongo = function() {
  return new Mongo();
};

module.exports.MongoWrapper = MongoWrapper;
