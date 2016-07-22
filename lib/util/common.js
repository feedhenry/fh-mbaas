var fs = require('fs');
var path = require('path');
var util = require('util');
var _ = require('underscore');
var assert = require('assert');
var logger = require('../util/logger').getLogger();

/**
 * First step to creating common error codes.
 *
 * TODO: Make A Module..
 * @param err
 * @param msg
 * @param code
 * @returns {{error: string}}
 */
function buildErrorObject(params) {
  params = params || {};

  var httpCode = params.httpCode || 500;
  //If the userDetail is already set, not building the error object again.
  if (params.err && params.err.userDetail) {
    return {
      errorFields: params.err,
      httpCode: httpCode
    };
  }

  var err = params.err || {message: "Unexpected Error"};
  var msg = params.msg || params.err.message || "Unexpected Error";
  //Custom Error Code
  var code = params.code || "FH-MBAAS-ERROR";

  var response = {
    errorFields: {
      userDetail: msg,
      systemDetail: msg + ' - ' + util.inspect(err),
      code: code
    },
    httpCode: httpCode
  };
  if (params.explain) {
    response.errorFields.explain = params.explain;
  }

  return response;
}

// set default response headers
function setResponseHeaders(res) {
  if (res.setHeader) {
    var contentType = res.getHeader('content-type');
    if (!contentType) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}

// get version from package.json (note this is softly cached)
var pkg;
function getVersion(cb) {
  if (pkg) {
    return cb(null, pkg.version);
  }

  fs.readFile(path.join(__dirname, '../../package.json'), function(err, data) {
    if (err) {
      return cb(err, null);
    }
    pkg = JSON.parse(data);
    return cb(null, pkg.version);
  });
}

function logError(err, msg, code, req) {
  var e = err;
  if (typeof err === 'object') {
    e = util.inspect(err);
  }
  logger.error({err: e, code: code, req: req}, msg);
}

// generic error handler
function handleError(err, msg, code, req, res) {
  logError(err, msg, code, req);

  var response = buildErrorObject({
    err: err,
    msg: msg,
    httpCode: code
  });

  logger.debug("Handling Error", {error: response});

  res.statusCode = response.httpCode;
  res.end(JSON.stringify(response.errorFields));
}

function getIPAddress(req) {
  var ipAddress =  "nonset"; // default value

  if (req.headers && req.headers['x-forwarded-for']) {
    ipAddress = req.headers['x-forwarded-for'];  // this may be a comma seperated list of addresses added by proxies and load balancers
  } else if (req.connection && req.connection.remoteAddress) {
    ipAddress = req.connection.remoteAddress;
  }

  return ipAddress;
}

// converts an object with arbitrary keys into an array sorted by keys
function sortObject(obj) {
  assert.ok(_.isObject(obj), 'Parameter should be an object! - ' + util.inspect(obj));
  assert.ok(!_.isArray(obj), 'Parameter should be an object, got array: ' + util.inspect(obj));

  var sortedKeys = _.keys(obj).sort();
  var sortedObjs = [];

  _.each(sortedKeys, function(key) {
    var val = {};
    val[key] = obj[key];
    sortedObjs.push(val);
  });

  return sortedObjs;
}

function randomPassword() {
  var n = 13;
  var a = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890';
  return make_passwd(n,a);
}

function randomUser() {
  var n = 12;
  var a = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890';
  var randomStr = make_passwd(n, a);
  return 'u' + randomStr;
}

function make_passwd(n,a) {
  var index = (Math.random() * (a.length - 1)).toFixed(0);
  return n > 0 ? a[index] + make_passwd(n - 1, a) : '';
}

function checkDbConf(db) {
  /*eslint-disable */
  assert.ok(null != db.host, 'db host is null'); //jshint ignore:line
  assert.ok(null != db.port, 'db port is null'); //jshint ignore:line
  assert.ok(null != db.name, 'db name is null'); //jshint ignore:line
  assert.ok(null != db.user, 'db user is null'); //jshint ignore:line
  assert.ok(null != db.pass, 'db pass is null'); //jshint ignore:line
  /*eslint-enable */
}

function formatDbUri(dbConf) {
  return util.format('mongodb://%s:%s@%s:%s/%s', dbConf.user, dbConf.pass, dbConf.host, dbConf.port, dbConf.name);
}

/**
 * Read file and return it size
 * If provided location is invalid first argument would contain error.
 *
 * @param fileLocation
 * @param callback
 */
function readFileSize(fileLocation, callback) {
  // Avoid relative paths also for security issues
  if (!path.isAbsolute(fileLocation)) {
    return callback(new Error('Path must be an absolute path!'));
  }

  fs.stat(fileLocation, function(err, stats) {
    if (err) {
      return callback(err);
    }
    if (!stats.isFile()) {
      return callback(new Error(fileLocation + " is not a file"));
    }
    return callback(null, stats.size);
  });
}

exports.setResponseHeaders = setResponseHeaders;
exports.getVersion = getVersion;
exports.handleError = handleError;
exports.buildErrorObject = buildErrorObject;
exports.logError = logError;
exports.getIPAddress = getIPAddress;
exports.sortObject = sortObject;
exports.randomPassword = randomPassword;
exports.randomUser = randomUser;
exports.checkDbConf = checkDbConf;
exports.formatDbUri = formatDbUri;
exports.make_passwd = make_passwd;
exports.readFileSize = readFileSize;
