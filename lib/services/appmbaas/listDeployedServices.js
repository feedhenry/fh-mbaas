var fhMbaasMiddleware = require('fh-mbaas-middleware');
var logger = require('../../util/logger').getLogger();


/**
 * Listing Deployed Services
 * @param params
 *  - domain:
 *  - environment:
 * @param cb
 */
module.exports = function listDeployedServices(params, cb) {

  logger.debug("listDeployedServices ", params);

  if (!params.domain || !params.environment) {
    logger.error("listDeployedServices: Invalid Parameters, ", {domain: !params.domain, environment: !params.environment});
    return cb(new Error("Missing Parameter: " + (params.domain ? "environment" : "domain")));
  }

  fhMbaasMiddleware.appmbaas().find({domain: params.domain, environment: params.environment, isServiceApp: true}, function(err, serviceApps) {
    if (err) {
      logger.error("Error Getting Deployed Services ", {error: err, params: params});
    }

    cb(err, serviceApps || []);
  });
};