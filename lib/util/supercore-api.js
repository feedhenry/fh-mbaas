var request = require('request');

function buildUrl(base, action, domain, env, appGuid){
  return base + '/api/v2/mbaas/' + domain + "/" + env + "/" + "apps" + "/" + appGuid + "/" + action;
}

/**
 * Push message back to supercore
 */
function pushStatus(params, cb){
  var securityToken = params.securityToken;
  var domain = params.domain;
  var appName = params.appName;
  var appGuid = params.appGuid;
  var coreHost = params.coreHost;
  var env = params.env;
  var status = params.status;
  var messages = params.messages;
  var logger = require('fh-config').getLogger();
  var url = buildUrl(coreHost,'migrationStatus', domain, env, appGuid);
  var data =  {
    securityToken: securityToken,
    domain: domain,
    env: env,
    appName: appName,
    appGuid: appGuid,
    messages: messages,
    status: status
  };
  logger.debug('send status update back to core', {url: url, data: data});
  request.post({
    url: url,
    json: data,
    headers: {
      "User-Agent": "FHMBAAS"
    }
  }, function(err, response, body){
    logger.debug('got response back from core', {status: response && response.statusCode, body: body});
    if(err){
      logger.error({
        error: err,
        status: response && response.statusCode,
        body: body
      }, 'Got error when calling supercore endpoint');
      return cb(err, response);
    }else{
      return cb(null, body);
    }
  });
}

exports.pushStatus = pushStatus;