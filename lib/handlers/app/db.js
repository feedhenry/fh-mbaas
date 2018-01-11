var fhconfig = require('fh-config');
var logger = require('../../util/logger').getLogger();
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

      var mongoUserdbNamespace  = process.env.MONGODB_USERDB_NAMESPACE;
      // if this envar is present return the connection string for userdb  
      if(mongoUserdbNamespace) {
        var mongoUserdbHost = fhconfig.value('mongo_userdb.host');
        var mongoUserdbReplicaSet = fhconfig.value('mongo_userdb.replicaset_name');
        appModel.dbConf.host = mongoUserdbHost;
        logger.info({mongoUserdbHost: mongoUserdbHost});
        req.resultData = {
          url: buildConnectionString(appModel.dbConf, mongoUserdbHost, mongoUserdbReplicaSet)
        };
        return next();
      } else { //otherwise return the system db
          var mongoHost = fhconfig.value('mongo.host');
          var replicaSet = fhconfig.value('mongo.replicaset_name');
          logger.info({mongoHost: mongoHost});
          req.resultData = {
            url: buildConnectionString(appModel.dbConf, mongoHost, replicaSet)
          };
          return next();
      }
    });
};

function buildConnectionString(dbConf, mongoHost, replicaSet) {
  var connString = "mongodb://" + dbConf.user + ":" + dbConf.pass + "@" + mongoHost + ":" + dbConf.port + "/" + dbConf.name;
  if (replicaSet) {
    connString +=  "?replicaSet=" + replicaSet;
  }

  return connString;
}
