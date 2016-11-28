var request = require('request');
var fhconfig = require('fh-config');
var logger = require('../util/logger').getLogger();
var url = require('url');

function getDitchUrl(path) {
  return url.format({
    protocol: fhconfig.value('fhditch.protocol'),
    hostname: fhconfig.value('fhditch.host'),
    port: fhconfig.value('fhditch.port'),
    pathname: path
  });
}

function doMigrate(domain, env, appName, securityToken, appGuid, coreHost, cb) {
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
  }, function(err, response, body) {
    if (err) {
      logger.error({error: err, body: body}, 'Got error when calling ditch migratedb endpoint');
      return cb(err, response);
    } else {
      return cb(null, body);
    }
  });
}

function checkStatus(cb) {
  var url = getDitchUrl('/sys/info/status');
  request.get({
    url: url,
    json: true,
    strictSSL: false
  }, function(err, response, body) {
    if (err) {
      return cb(err);
    }
    return cb(null, {statusCode: response.statusCode, status: body.status, message: body.message});
  });
}

function removeAppCollection(appName, cb) {
  var url = getDitchUrl('/admin/dropCollection');
  request.del({
    url: url,
    headers: {
      'x-fh-service-key': fhconfig.value('fhditch.service_key')
    },
    json: {
      appName: appName
    },
    strictSSL: false
  }, function(err, response, body) {
    if (err) {
      return cb(err);
    }
    return cb(null, {response: response, body: body});
  });
}

function getAppInfo(appName, cb) {
  var url = getDitchUrl('/conn/shared');

  logger.info('Invoking ditch:', {url: url, appName: appName});

  request(
    {
      url: url,
      headers: {
        'x-fh-service-key': fhconfig.value('fhditch.service_key')
      },
      qs: {
        app: appName
      }
    }, function(err, res, body) {
    if (err) {
      return cb(err);
    }
    if (res.statusCode !== 200) {
      return cb('Http Error: ' + res.statusCode, body);
    }

    return cb(null, JSON.parse(body));
  }
  );
}


exports.doMigrate = doMigrate;
exports.checkStatus = checkStatus;
exports.removeAppCollection = removeAppCollection;
exports.getAppInfo = getAppInfo;