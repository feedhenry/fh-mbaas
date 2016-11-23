var request = require('request');
var log = require('../logger').getLogger();
var _ = require('underscore');

/**
 * Calling A Service Endpoint
 * @param params
 *  - accessKey: The Access Key Needed To Call The Service
 *  - fullUrl: The Full URL Needed To Call The Service
 * @param cb
 */
module.exports = function requstEndpointData(params, cb) {

  log.logger.debug("requstEndpointData", params);

  request.get({
    url: params.fullUrl,
    headers: {
      'X-FH-SERVICE-ACCESS-KEY': params.accessKey
    },
    json: true
  }, function(err, httpResponse, body) {
    if (err) {
      log.logger.debug("Error Getting Endpoint Data ", {error: err, params: params});
      return cb(err);
    }

    var error;
    if (httpResponse.statusCode > 204) {
      error = {
        userDetail: "Invalid HTTP Response: " + httpResponse.statusCode,
        systemDetail: body,
        code: "INVALID_HTTP_RESPONSE"
      };
      log.logger.debug("Error Getting Endpoint Data ", error, params);
    } else {
      //The body of the response should at least be an array
      if (!_.isArray(body)) {
        error = {
          userDetail: "Invalid data type response.",
          systemDetail: "Expected an Array but got " + typeof body,
          code: "INVALID_DATA"
        };
      }
      log.logger.debug("Finished Getting Endpoint Data ", {body: body, params: params});
    }

    cb(error, body);
  });
};
