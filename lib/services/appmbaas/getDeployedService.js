var fhMbaasMiddleware = require('fh-mbaas-middleware');
var logger = require('../../util/logger').getLogger();


/**
 * Listing Deployed Services
 * @param params
 *  - domain: Domain
 *  - environment: Environment
 *  - guid: Service Guid
 * @param cb
 */
module.exports = function getDeployedService(params, cb) {

  logger.debug("getDeployedService ", params);

  if (!params.domain || !params.environment || !params.guid) {
    logger.error("getDeployedService: Invalid Parameters, ", {domain: !params.domain, environment: !params.environment});
    return cb(new Error("Missing Parameter: " + (params.domain ? "environment" : "domain")));
  }

  fhMbaasMiddleware.appmbaas().findOne({domain: params.domain, environment: params.environment, isServiceApp: true, guid: params.guid}, function(err, serviceApps) {
    if (err) {
      logger.error("Error Getting Deployed Service ", {error: err, params: params});
    }

    cb(err, serviceApps);
  });
};