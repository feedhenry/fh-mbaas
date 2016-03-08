var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();

exports.getConnectionString = function(req, res, next) {

  logger.info({appMbaasModel: req.appMbaasModel});

  var appModel = req.appMbaasModel;
  if (! appModel || ! appModel.dbConf){
    return next({"code":404, "message": "no db conf for app"});
  }

  fhconfig.reload([], function reloaded(err){
    if (err){
      return next(err);
    }
    var mongoHost = fhconfig.value('mongo.host');
    logger.info({mongoHost: mongoHost});
    req.resultData = {
      url: buildConnectionString(appModel.dbConf,mongoHost)
    };
    return next();
  });
};


function buildConnectionString(dbConf, mongoHost){
  return "mongodb://"+dbConf.user+":"+dbConf.pass + "@" + mongoHost + ":" + dbConf.port+"/"+dbConf.name;
}
