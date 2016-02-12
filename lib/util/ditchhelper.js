var request = require('request');
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var url = require('url');

function getDitchUrl(path){
  return url.format({
    protocol: fhconfig.value('fhditch.protocol'),
    hostname: fhconfig.value('fhditch.host'),
    port: fhconfig.value('fhditch.port'),
    pathname: path
});
}

function doMigrate(domain, env, appName, securityToken, appGuid, coreHost, cb){
  var url = getDitchUrl('/admin/migratedb');
  request.post({
    url: url,
    headers: {
      'x-fh-service-key': fhconfig.value('fhditch.service_key')
    },
    json: {
      securityToken: securityToken,
      domain: domain,
      env: env,
      appName: appName,
      appGuid: appGuid,
      coreHost: coreHost
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
