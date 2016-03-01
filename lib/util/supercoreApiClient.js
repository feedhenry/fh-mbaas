var request = require('request');

function buildUrl(base,domain, env, appGuid){
  if(base.indexOf("http")!==0){
    base = "https://" + base;
  }
  return base + "/api/v2/mbaas/" + domain + "/" + env + "/" + "apps" + "/" + appGuid + "/mbaasMessage";
}

/**
 * Endpoint used to notify supercore with speicified payload.
 *
 * messageType - type of message to sent - requires specified handler to be defined in supercore.
 * data - data to send
 * coreHost - base url to supercore
 */
function sendMessageToSupercore(coreHost, requestType, data, cb){
  var logger = require('fh-config').getLogger();
  // Setting request type to payload
  data.requestType = requestType;
  var url = buildUrl(coreHost, data.domain, data.env, data.appGuid);
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

// Sends message back to supercore
exports.sendMessageToSupercore  = sendMessageToSupercore;