var appAuth =  require('fh-mbaas-middleware').auth;

/**
 * Authentication For Administrative APIs in mbaas (/api/mbaas)
 * @param fhconfig
 * @returns {Function}
 */
function adminAuth(fhconfig) {

  var servicekey = fhconfig.value('fhmbaas.key');

  return function(req, res, next) {
    if (servicekey && servicekey.length > 0) {
      var key = req.get('x-fh-service-key');
      if (key === servicekey) {
        next();
      } else {
        res.status(401).end();
      }
    } else {
      next();
    }
  };
}

module.exports = {
  admin: adminAuth,
  app: appAuth
};
