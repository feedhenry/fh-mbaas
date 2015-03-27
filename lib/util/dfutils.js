// In most clusters, the dyno name will be <domain-env>, in older ones it will be just <domain>
var util = require('util');
var fhdfc = require('fh-dfc');
var config = require('fh-config');
var dfc = fhdfc(config.value('fhdfc'));

var cache = {};  // cheap cache, TODO - move this to redis...
var cacheInterval = setInterval(function() {
  cache = {};
}, 300000);  // TODO - make timeout configurable


function checkDynoNameForApp(dynoname, appname, cb){
  dfc.dynos([dynoname], function(err){
    if (err) {
      return cb('Problems reaching Dyno ' + dynoname + ' app:' + appname + ' err: ' + util.inspect(err));
    } else {
      var cmd = 'read-app';
      dfc[cmd]([dynoname, appname], function(err){
        if(err){
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
  if(cache[cacheKey]){
    return cb(null, cache[cacheKey]);
  }
  checkDynoNameForApp(dynoName, appname, function(err){
    if(err){
      dynoName = domain;
      checkDynoNameForApp(dynoName, appname, function(err){
        if(err){
          return cb('Can not find dyno for app :' + appname + ' in domain : ' + domain + ' env: ' + env);
        } else {
          cache[cacheKey] = dynoName;
          return cb(null, dynoName);
        }
      });
    } else {
      cache[cacheKey] = dynoName;
      return cb(null, dynoName);
    }
  })
}

function stopApp(domain, env, app, cb){
  getDynoNameFromDynoFarm(domain, env, app, function(err, dynoName){
    if(err){
      return cb(err);
    }
    var cmd = 'stop-app';
    dfc[cmd]([dynoName, app], function(err){
      if(err){
        return cb(err);
      }
      return cb();
    });
  });
}

exports.stopApp = stopApp;
exports.clearInterval = function() { clearInterval(cacheInterval);};