var request = require('request');
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var url = require('url');
var loggerPrefix = 'fh-mbaas: ditch helper - ';

function getDitchUrl(path){
  return url.format({
    protocol: fhconfig.value('fhditch.protocol'),
    hostname: fhconfig.value('fhditch.host'),
    port: fhconfig.value('fhditch.port'),
    pathname: path
  });
}

function checkMigrateStatus(domain, env, appName, cacheKey, appGuid, cb){
  var url = getDitchUrl('/sys/admin/migratestatus');
  logger.info(loggerPrefix + 'posting check status');
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
      logger.error({error: err, status: response.statusCode, body: body}, loggerPrefix + 'Got error when calling ditch migratestatus endpoint');
      return cb(err, response);
    } else {
      logger.info(loggerPrefix + 'check status response: ', body);
      return cb(null, body);
    }
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

function checkStatus(cb){
  var url = getDitchUrl('/sys/info/status');
  request.get({
    url: url,
    json: true,
    strictSSL: false
  }, function(err, response, body){
    if(err){
      return cb(err);
    }
    return cb(null, {statusCode: response.statusCode, status: body.status, message: body.message});
  });
}

exports.doMigrate = doMigrate;
exports.checkStatus = checkStatus;
exports.checkMigrateStatus = checkMigrateStatus;
