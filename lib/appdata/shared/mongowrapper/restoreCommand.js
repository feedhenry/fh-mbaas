var child_process = require('child_process');
const addParam = require('../commandUtils').addParam;
const addBooleanParam = require('../commandUtils').addBooleanParam;
const CONSTANTS = require('../constants');
const common = require('../common');
const RESTORE = 'mongorestore';
const async = require('async');

function Restore() {
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

  this.withVerbose = function(verbose) {
    self.paramsMap.verbose = verbose;
    return self;
  };

  this.withAuthenticationDatabase = function(authDatabase) {
    self.paramsMap.authDatabase = authDatabase;
    return self;
  };

  this.withAuthenticationMechanism = function(mechanism) {
    self.paramsMap.mechanism = mechanism;
    return self;
  };

  this.withDbPath = function(dbPath, journal) {
    self.paramsMap.dbPath = dbPath;
    self.paramsMap.journal = journal;
    return self;
  };

  this.withDirectoryPerDb = function() {
    self.paramsMap.directoryPerDB = true;
    return self;
  };

  this.withDatabase = function(database) {
    self.paramsMap.database = database;
    return self;
  };

  this.withCollection = function(collection) {
    self.paramsMap.collection = collection;
    return self;
  };

  this.withObjcheck = function(objcheck) {
    self.paramsMap.objcheck = objcheck;
    return self;
  };

  this.withFilter = function(filter) {
    self.paramsMap.filter = filter;
    return self;
  };

  this.withDrop = function() {
    self.paramsMap.drop = true;
    return self;
  };

  this.withOpLogReplay = function() {
    self.paramsMap.opLogReplay = true;
    return self;
  };

  this.withOpLogLimit = function(limit) {
    self.paramsMap.opLogLimit = limit;
    return self;
  };

  this.withKeepIndexVersion = function() {
    self.paramsMap.keepIndexVersion = true;
    return self;
  };

  this.withNoOptionsRestore = function() {
    self.paramsMap.noOptionsRestore = true;
    return self;
  };

  this.withNoIndexRestore = function() {
    self.paramsMap.noIndexRestore = true;
    return self;
  };

  this.withMinimumNumberOfReplicaPerWrite = function(number) {
    self.paramsMap.minimumNumberOfReplicasPerWrite = number;
    return self;
  };

  this.withPath = function(path) {
    self.paramsMap.path = path;
    return self;
  };

  this.withDetectMaster = function() {
    self.paramsMap.detectMaster = true;
    return self;
  };
}

function fillHostAndPort(paramsMap, cb) {
  if (paramsMap.detectMaster) {
    common.getMongoHost(paramsMap.host, paramsMap.port, CONSTANTS.MONGO_HOST_ROLE.MASTER, function(err, result) {
      if (err) {
        return cb(err);
      }
      paramsMap.host = result.host;
      paramsMap.port = result.port;

      return cb(null, paramsMap);
    });
  } else {
    cb(null, paramsMap);
  }
}

/**
 * Creates an array of parameters, as expected by spawn, based on how the object has been configured.
 *
 * @param paramsMap map of all the configured parameters
 * @returns {Array} an array as expected by spawn
 */
function buildParamsAry(paramsMap, cb) {
  var result = [];

  addParam(result, paramsMap, 'host', '--host');
  addParam(result, paramsMap, 'port', '--port');
  addParam(result, paramsMap, 'username', '--username');
  addParam(result, paramsMap, 'password', '--password');
  addParam(result, paramsMap, 'authDatabase', '--authenticationDatabase');
  addParam(result, paramsMap, 'mechanism', '--authenticationMechanism');
  addParam(result, paramsMap, 'dbPath', '--dbpath');
  addBooleanParam(result, paramsMap, 'directoryPerDB', '--directoryPerDB');
  addBooleanParam(result, paramsMap, 'journal', '--journal');
  addParam(result, paramsMap, 'database', '--db');
  addParam(result, paramsMap, 'collection', '--collection');
  addBooleanParam(result, paramsMap, 'objcheck', '--objcheck');
  addBooleanParam(result, paramsMap, 'objcheck', '--noobjcheck', true);
  addParam(result, paramsMap, 'filter', '--filter');
  addBooleanParam(result, paramsMap, 'drop', '--drop');
  addBooleanParam(result, paramsMap, 'opLogReplay', '--oplogReplay');
  addParam(result, paramsMap, 'opLogLimit', '--oplogLimit');
  addBooleanParam(result, paramsMap, 'keepIndexVersion', '--keepIndexVersion');
  addBooleanParam(result, paramsMap, 'noOptionsRestore', '--noOptionsRestore');
  addBooleanParam(result, paramsMap, 'noIndexRestore', '--noIndexRestore');
  addParam(result, paramsMap, 'minimumNumberOfReplicasPerWrite', '--w');

  // this must be the last, together with directory (only one of them is allowed)
  if (paramsMap.path) {
    result.push(paramsMap.path);
  }

  cb(null, result);
}

function validateParams(paramsMap, cb) {
  if (!paramsMap.path) {
    return cb('Path to the import file (or containing directory) is mandatory');
  }
  cb(null, paramsMap);
}

/**
 * Spawns the restore command with the configured parameters
 * @returns {*}
 */
Restore.prototype.run = function(cb) {

  async.waterfall([
    async.apply(fillHostAndPort, this.paramsMap),
    validateParams,
    buildParamsAry
  ], function(err, params) {
    if (err) {
      return cb(err);
    }

    cb(null, child_process.spawn(RESTORE, params));
  });
};

module.exports.Restore = Restore;