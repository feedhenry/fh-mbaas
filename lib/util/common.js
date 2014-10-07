var fs = require('fs');
var path = require('path');
var util = require('util');
var logger = require('./logger.js').getLogger();
var _ = require('underscore');
var assert = require('assert');

// set default response headers
function setResponseHeaders(res) {
  if(res.setHeader) {
    var contentType = res.getHeader('content-type');
    if (!contentType) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}

// get version from package.json (note this is softly cached)
var pkg;
function getVersion(cb) {
  if (pkg) return cb(null, pkg.version);

  fs.readFile(path.join(__dirname, '../../package.json'), function(err, data){
    pkg = JSON.parse(data);
    return cb(null, pkg.version);
  });
}

function logError(err, msg, code, req) {
  var e = err;
  if (typeof err === 'object') e = util.inspect(err);
  logger.error({err: e, code: code, req: req}, msg);
}

// generic error handler
function handleError(err, msg, code, req, res){
  logError(err, msg, code, req);
  res.statusCode = code;
  res.end(msg + ' - ' + util.inspect(err));
}

function getIPAddress(req){
  var ipAddress =  "nonset"; // default value

  if (req.headers && req.headers['x-forwarded-for']) {
    ipAddress = req.headers['x-forwarded-for'];  // this may be a comma seperated list of addresses added by proxies and load balancers
  } else if (req.connection && req.connection.remoteAddress) {
    ipAddress = req.connection.remoteAddress;
  }

  return ipAddress;
}

// converts an object with artbtary keys into an array sorted by keys
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

function make_passwd(n,a) {
  var index = (Math.random() * (a.length - 1)).toFixed(0);
  return n > 0 ? a[index] + make_passwd(n - 1, a) : '';
}

exports.setResponseHeaders = setResponseHeaders;
exports.getVersion = getVersion;
exports.handleError = handleError;
exports.logError = logError;
exports.getIPAddress = getIPAddress;
exports.sortObject = sortObject;
exports.randomPassword = randomPassword;