'use strict';
let fhMbaasMiddleware = require('fh-mbaas-middleware');
let logger = require('../../util/logger').getLogger();

//listDeployedAppsForEnvironment takes a  domain and environment and returns the apps that are deployed to that environment.
module.exports = function listDeployedAppsForEnvironment(domain, environment,cb) {
  logger.debug("listDeployedAppsForEnvironment ", domain, environment);

  if (!domain || !environment) {
    logger.error("listDeployedAppsForEnvironment: Invalid Parameters, ", { domain: domain, environment: environment });
    return cb(new Error("Missing Parameter: " + (domain ? "environment" : "domain")));
  }

  fhMbaasMiddleware.appmbaas().find({ domain: domain, environment: environment }, cb);
};
