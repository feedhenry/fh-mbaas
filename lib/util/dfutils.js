// In most clusters, the dyno name will be <domain-env>, in older ones it will be just <domain>
var util = require('util');
var dfc = require('fh-dfc');

var cache = {};  // cheap cache, TODO - move this to redis...
var cacheInterval = setInterval(function() {
  cache = {};
}, 300000);  // TODO - make timeout configurable

function getDynoNameFromDynoFarm(domain, env, cb) {
  var dynoName = domain + '-' + env;

  // check the cache
  if (cache[dynoName]) {
    return cb(null, cache[dynoName]);
  }

  dfc.dynos([dynoName], function(err, data) {
    if (err) {
      dynoName = domain;
      dfc.dynos([dynoName], function(err, data) {
        if (err) return cb('Problems reaching Dyno for domain: ' + domain + ' env: ' + env + ' dynoName: ' + dynoName + ' err: ' + util.inspect(err));
        cache[dynoName] = dynoName;
        return cb(null, dynoName);
      });
    } else {
      cache[dynoName] = dynoName;
      return cb(null, dynoName);
    }
  });
}

function stopApp(domain, env, app, cb){
  getDynoNameFromDynoFarm(domain, env, function(err, dynoName){
    if(err){
      return cb(err);
    }
    var cmd = 'stopapp';
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