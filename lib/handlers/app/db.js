var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();

exports.getConnectionString = function(req, res, next) {
  // TODO: reload config to ensure latest ips of replset
  var mongoHost = fhconfig.value('mongo.host');
  logger.info({mongoHost: url});
  logger.info({appMbaasModel: req.appMbaasModel});

  res.resultData = {
    url: mongoHost
  };
  return next();
};
