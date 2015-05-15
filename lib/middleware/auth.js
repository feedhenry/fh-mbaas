var appMiddleware = require('../middleware/app.js');
var logger = require('fh-config').getLogger();

/**
 * Authentication For Administrative APIs in mbaas (/api/mbaas)
 * @param fhconfig
 * @returns {Function}
 */
function adminAuth(fhconfig){

  var servicekey = fhconfig.value('fhmbaas.key');

  return function(req, res, next){
    if(servicekey && servicekey.length > 0){
      var key = req.get('x-fh-service-key');
      if(key === servicekey){
        next();
      } else {
        res.status(401).end();
      }
    } else {
      next();
    }
  };
}

/**
 * Authentication For App APIs In Mbaas (/api/mbaas)
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
function appAuth(req, res, next){

  var apiKey = req.get('x-fh-auth-app');
  var envAccessKey = req.get('x-fh-env-access-key');

  logger.debug("Authenticating App ", apiKey, envAccessKey, req.params);

  if(!apiKey || !envAccessKey){
    res.status(401);
    return res.end();
  }

  appMiddleware.getMbaasApp({
    domain: req.params.domain,
    environment: req.params.environment,
    guid: req.params.appid,
    accessKey: envAccessKey,
    apiKey: apiKey
  }, function(err, mbaasApp){
    if(!mbaasApp){
      logger.debug("App Not Valid For Params ", apiKey, envAccessKey, req.params);
      return res.status(401).json({});
    }

    logger.debug("App Valid For Params ", apiKey, envAccessKey, req.params);
    req.appMbaasModel = mbaasApp;
    //Authorised, moving on.
    next();
  });
}

module.exports = {
  admin: adminAuth,
  app: appAuth
};