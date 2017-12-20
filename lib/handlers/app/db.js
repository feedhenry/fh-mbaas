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

    var mongoHost = fhconfig.value('mongo.host');
    var replicaSet = fhconfig.value('mongo.replicaset_name');
    var mongoCount = fhconfig.value('mongo.count');
    var namespace = fhconfig.value('fhmbaas.namespace');

    logger.info({mongoHost: mongoHost});

    if (mongoCount) {
      mongoHost = _.range(parseInt(mongoCount)).map(function (i) {
        return 'mongodb-' + (i + 1) + '.' +  namespace;
      });
    }

    req.resultData = {
      url: buildConnectionString(appModel.dbConf, mongoHost, replicaSet)
    };
    return next();

  });
};

function buildConnectionString(dbConf, mongoHost, replicaSet) {
  var connString = ['mongodb://'];

  mongoHost.forEach(function(host, index) {
    if (index > 0) {
      connString.push(',');
    }
    connString.push(buildDBHost(dbConf, host, replicaSet));
  });

  connString.push('/' + dbConf.name);

  return connString.join('');
}


function buildDBHost(dbConf, host, replicaSet) {
  var connString = dbConf.user + ':' + dbConf.pass + '@' + host + ':' + dbConf.port;

  if (replicaSet) {
    connString += "?replicaSet=" + replicaSet;
  }

  return connString;
}
