var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var exec = require('child_process').exec;

exports.getConnectionString = function(req, res, next) {

  logger.info({appMbaasModel: req.appMbaasModel});

  var appModel = req.appMbaasModel;
  if (! appModel || ! appModel.dbConf) {
    return next({"code":404, "message": "no db conf for app"});
  }

  fhconfig.reload([], function reloaded(err) {
    if (err) {
      return next(err);
    }

    var mongoHost = fhconfig.value('mongo.host');
    var replicaSet =  fhconfig.value('mongo.replicaSet');

    // the service name in the template is set to mongodb-1 (for mongodb3.x)
    // check for it, if it is set then we have to resolve it
    // the cloud app is in a different namespace

    if (mongoHost === 'mongodb-1') {
      exec('dig mongodb-1 A +search +short', function(err, stdout, stderr) {
        if (err) {
          logger.error(err);
          return next(err);
        }
        logger.info({'dig result': stdout});
        var host = stdout.replace(/\n$/, '');
        req.resultData = {
          url: buildConnectionString(appModel.dbConf,host,replicaSet)
        };
        return next();
      });
    } else {
      logger.info({mongoHost: mongoHost});
      req.resultData = {
        url: buildConnectionString(appModel.dbConf,mongoHost,null)
      };
      return next();
    }
  });
};

function buildConnectionString(dbConf, mongoHost, replicaSet) {
  if (replicaSet) {
    return "mongodb://"+dbConf.user+":"+dbConf.pass + "@" + mongoHost + ":" + dbConf.port+"/"+dbConf.name + "?replicaSet=" + replicaSet;
  } else {
    return "mongodb://"+dbConf.user+":"+dbConf.pass + "@" + mongoHost + ":" + dbConf.port+"/"+dbConf.name ;
  }
}
