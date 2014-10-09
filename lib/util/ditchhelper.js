var request = require('request');
var config = require('./config').getConfig();
var logger = require('./logger').getLogger();
var url = require('url');

function getDitchUrl(path){
  return url.format({
    protocol: config.fhditch.protocol,
    hostname: config.fhditch.host,
    port: config.fhditch.port,
    pathname: path
  });
}

function doMigrate(domain, env, appName, cacheKey, appGuid, cb){
  var url = getDitchUrl('/sys/admin/migratedb');
  request.post({
    url: url,
    json: {
      cacheKey: cacheKey,
      domain: domain,
      env: env,
      appName: appName,
      appGuid: appGuid
    }
  }, function(err, response, body){
    if(err){
      logger.error({error: err, status: response.statusCode, body: body}, 'Got error when calling ditch migratedb endpoint');
      return cb(err, response);
    } else {
      return cb(null, body);
    }
  });
}

function migrateComplete(domain, env, appName, cacheKey, appGuid, cb){
  var url = getDitchUrl('/sys/admin/completeMigration');
  request.post({
    url: url,
    json: {
      domain: domain,
      env: env,
      appName: appName,
      cacheKey: cacheKey,
      appGuid: appGuid
    }
  }, function(err, response, body){
    if(err){
      logger.error({error: err, status: response.statusCode, body: body}, 'Got error when calling ditch completeMigration endpoint');
      return cb(err, response);
    } else {
      return cb(null, body);
    }
  });
}

exports.doMigrate = doMigrate;
exports.migrateComplete = migrateComplete;