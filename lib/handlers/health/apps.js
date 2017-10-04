var request = require('request');
var async = require('async');
var fhconfig = require('fh-config');
var logger = require('../../util/logger').getLogger();
var _ = require('underscore');
var extend = require('util')._extend;

var dfc;

// Default timeout: 15 seconds
var DEFAULT_TIMEOUT = 15*1000;
// URI called to check if the app is reachable
var DEFAULT_PING_URI = '/sys/info/ping';

var STATUS_OK = "OK";
var STATUS_ERROR = "error";


if (!fhconfig.value('openshift3')) {
  var fhdfc = require('fh-dfc');
  dfc = fhdfc(fhconfig.value('fhdfc'));
}

/**
 * Utility function to build a result object
 * @param status result status
 * @param error optional error message
 * @returns {{status: *, error: *}}
 */
function result(status, error) {
  return { status, error };
}

/**
 * Returns all the running app on a given dyno
 * @param dyno
 * @param callback
 */
function getRunningAppsFromDyno(dyno, callback) {
  dfc.apps.list(dyno.dyno, 'detailed', function(err, apps) {
    if (err) {
      logger.error("Unable to get the the list of deployed cloud-apps", { dyno: dyno.dyno, err: err });
      return callback(err);
    }
    return callback(err, _.filter(apps, function(app){ return app.state === 'RUNNING'; }));
  });
}

/**
 * Returns the URL of a given cloud app running on a given dyno
 * @param dyno
 * @param app
 * @param callback
 */
function getCloudAppUrl(dyno, app, callback) {
  dfc.url([dyno.dyno, app.app], function (err, url) {
    if (err) {
      logger.error("Unable to get cloud app URL", { dyno: dyno.dyno, err: err });
    }
    callback(err, url);
  });
}

/**
 * Returns the URLs of all the running apps on a given dyno
 * @param dyno
 * @param apps
 * @param callback
 */
function getCloudAppsUrl(dyno, apps, callback) {
  var res = {};
  async.each(apps, function(app, cb) {
    async.waterfall([
      async.apply(getCloudAppUrl, dyno, app),
      function(url, cb1) {
        res[app.app] = {'dyno': dyno.dyno, 'url': url};
        cb1();
      }
    ], function(err) {
      cb(err);
    })
  }, function(err) {
    callback(err, res);
  });
}

/**
 * Returns the URLs of all the running apps on all the give dynos
 * @param dynos
 * @param callback
 */
function getAllRunningAppUrl(dynos, callback) {
  var res = {};
  async.each(dynos, function (dyno, cb) {
    async.waterfall([
      async.apply(getRunningAppsFromDyno, dyno),
      async.apply(getCloudAppsUrl, dyno),
      function(cloudApps, cb1) {
        extend(res,  cloudApps);
        cb1();
      }
    ], function(err) {
      cb(err);
    })
  }, function(err) {
    callback(err, res);
  });

}

/**
 * Checks that the health is ok
 * @param appData App data in the format {url: appUrl, dyno: dyno}
 * @param appName Name of the app
 * @param cb
 */
function checkAppHealth(appData, appName, cb) {
  request({
    baseUrl: appData.url,
    uri: DEFAULT_PING_URI,
    timeout: DEFAULT_TIMEOUT
  }, function(err, response, body) {

    if (err) {
      logger.error('Error invoking health check endpoint', {appName: appName, appData: appData, uri: DEFAULT_PING_URI, err: err});
      return cb(result(STATUS_ERROR, 'Error invoking health check endpoint'));
    }

    if (response.statusCode !== 200) {
      logger.error('Error invoking endpoint', {appName: appName, appData: appData, err: response.statusMessage, code: response.statusCode});
      return cb(result(STATUS_ERROR, response.statusMessage));
    }

    var res = JSON.parse(body);

    if (res === STATUS_OK) {
      return cb(null, result(STATUS_OK, null));
    }

    return cb(result(STATUS_ERROR, {appData: appData, message: res}));
  });
}

function checkAppsHealth(appsData, cb) {
  var result = {};

  async.forEachOf(appsData, function (appData, appName, callback) {
      checkAppHealth(appData, appName, function(err, res) {

        // We want to report only failing apps to avoid huge responses
        if (err) {
          result[appName] = res;
        }

        callback(err);
      });
    }, function(err) {
    cb(err, result);
  });
}

/**
 * Checks the status of all the apps running on all the dynos
 * @param callback
 * @returns {*}
 */
function checkApps(callback) {
  async.waterfall([
      async.apply(dfc.dynos.list, 'detailed'),
      getAllRunningAppUrl,
      checkAppsHealth
    ], function(err, res) {
      return callback(err, res);
    }
  );
}

module.exports.checkAppsStatus=checkApps;