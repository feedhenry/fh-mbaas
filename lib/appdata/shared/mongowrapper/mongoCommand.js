var child_process = require('child_process');
const addParam = require('../commandUtils').addParam;
const addBooleanParam = require('../commandUtils').addBooleanParam;
const MONGO = 'mongo';
const async = require('async');

function Mongo() {
  this.paramsMap = {};

  var self = this;

  // Fluent api to be used for configuring
  this.withHost = function(host) {
    self.paramsMap.host = host;
    return self;
  };

  this.withPort = function(port) {
    self.paramsMap.port = port;
    return self;
  };

  this.withQuiet = function() {
    self.paramsMap.quiet = true;
    return self;
  };

  this.withEval = function(evalString) {
    self.paramsMap.eval = evalString;
    return self;
  };

}

/**
 * Creates an array of parameters, as expected by spawn, based on how the object has been configured.
 *
 * @param paramsMap map of all the configured parameters
 * @returns {Array} an array as expected by spawn
 */
function buildParamsAry(paramsMap, cb) {
  var result = [];

  addBooleanParam(result, paramsMap, 'quiet', '--quiet');
  addParam(result, paramsMap, 'host', '--host');
  addParam(result, paramsMap, 'port', '--port');
  addParam(result, paramsMap, 'eval', '--eval');

  cb(null, result);
}

function validateParams(paramsMap, cb) {
  if (!paramsMap.host) {
    return cb('Database host is mandatory');
  }
  cb(null, paramsMap);
}

/**
 * Spawns the restore command with the configured parameters
 * @returns {*}
 */
Mongo.prototype.run = function(cb) {

  async.waterfall([
    async.apply(validateParams, this.paramsMap),
    buildParamsAry
  ], function(err, params) {
    if (err) {
      return cb(err);
    }

    cb(null, child_process.spawn(MONGO, params));
  });
};

module.exports.Mongo = Mongo;