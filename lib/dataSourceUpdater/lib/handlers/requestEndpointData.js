var request = require('request');
var logger = require('fh-config').getLogger();

/**
 * Calling A Service Endpoint
 * @param params
 *  - accessKey: The Access Key Needed To Call The Service
 *  - fullUrl: The Full URL Needed To Call The Service
 * @param cb
 */
module.exports = function requstEndpointData(params, cb){

  logger.debug("requstEndpointData", params);

  request.get({
    url: params.fullUrl,
    headers: {
      'X-FH-SERVICE-ACCESS-KEY': params.accessKey
    },
    json: true
  }, function(err, httpResponse, body){
    if(err){
      logger.error("Error Getting Endpoint Data ", {error: error, params: params});
      return cb(err);
    }

    var error;
    if(httpResponse.statusCode > 204){
      error = {
        userDetail: "Invalid Response: " + httpResponse.statusCode,
        systemDetail: body,
        code: httpResponse.statusCode
      };
      logger.error(error, params);
    } else {
      logger.debug("Finished Getting Endpoint Data ", {body: body, params: params});
    }



    cb(error, body);
  });
};