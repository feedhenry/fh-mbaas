// In most clusters, the dyno name will be <domain-env>, in older ones it will be just <domain>
var util = require('util');
var config = require('fh-config');
var _ = require('underscore');
var dfc;

if (!config.value('openshift3')) {
  var fhdfc = require('fh-dfc');
  dfc = fhdfc(config.value('fhdfc'));
}

var cache = {};  //TODO - move this to redis.

var cacheTimeoutValue = config.value("fhdfc.cache_timeout");

//If the cache timeout value is not set, then the process should throw an error.
//This is because the interval will consume CPU if invalid.
if (!_.isNumber(cacheTimeoutValue) || cacheTimeoutValue <= 200) {
  throw "Invalid Config Value For cache_timeout. Must be a Number >= 200ms";
}

var cacheInterval = setInterval(function() {
  cache = {};
}, cacheTimeoutValue);

function checkDynoNameForApp(dynoname, appname, cb) {
  dfc.dynos([dynoname], function(err) {
    if (err) {
      return cb('Problems reaching Dyno ' + dynoname + ' app:' + appname + ' err: ' + util.inspect(err));
    } else {
      var cmd = 'read-app';
      dfc[cmd]([dynoname, appname], function(err) {
        if (err) {
          return cb('Failed to find app ' + appname + ' in dyno : ' + dynoname + ' err: ' + util.inspect(err));
        } else {
          return cb(null, dynoname);
        }
      });
    }
  });
}

function getDynoNameFromDynoFarm(domain, env, appname, cb) {
  var dynoName = domain + '-' + env;
  var cacheKey = domain + '-' + env;
  if (cache[cacheKey]) {
    return cb(null, cache[cacheKey]);
  }
  checkDynoNameForApp(dynoName, appname, function(err) {
    if (err) {
      dynoName = domain;
      checkDynoNameForApp(dynoName, appname, function(err) {
        if (err) {
          return cb('Can not find dyno for app :' + appname + ' in domain : ' + domain + ' env: ' + env + ' err: ' + util.inspect(err));
        } else {
          cache[cacheKey] = dynoName;
          return cb(null, dynoName);
        }
      });
    } else {
      cache[cacheKey] = dynoName;
      return cb(null, dynoName);
    }
  });
}

function stopApp(domain, env, app, cb) {
  getDynoNameFromDynoFarm(domain, env, app, function(err, dynoName) {
    if (err) {
      // Can't get the dyno for an app so it's not deployed anywhere. In that case there
      // is also no need to stop the app and we can just continue.
      return cb();
    }
    var cmd = 'stop-app';
    dfc[cmd]([dynoName, app], function(err) {
      if (err) {
        return cb(err);
      }
      return cb();
    });
  });
}

function migrateAppDb(action, domain, env, app, cb) {
  getDynoNameFromDynoFarm(domain, env, app, function(err, dynoName) {
    if (err) {
      return cb(err);
    }
    var cmd = 'appmigrate';
    dfc[cmd]([action, dynoName, app], function(err) {
      if (err) {
        return cb(err);
      }
      return cb();
    });
  });
}

function reloadEnv(domain, env, app, cb) {
  getDynoNameFromDynoFarm(domain, env, app, function(err, dynoName) {
    if (err) {
      return cb(err);
    }
    var cmd = 'env';
    dfc[cmd](['get', dynoName, app], function(err, envs) {
      if (err) {
        return cb(err);
      }
      dfc[cmd](['set', dynoName, app, envs, domain, env], function(err) {
        if (err) {
          return cb(err);
        }
        return cb();
      });
    });
  });
}

exports.stopApp = stopApp;
exports.migrateAppDb = migrateAppDb;
exports.reloadEnv = reloadEnv;
exports.clearInterval = function() {
  clearInterval(cacheInterval);
};
