var mongoUtils = require('../util/mongo.js');
var fhconfig = require('fh-config');
var _ = require('underscore');


function fixFormDbUrl(req, res, next) {
    if (!mongoUtils.hasUserSpaceDb()) {
        return next();
    }

    fhconfig.reloadRawConfig(function reloaded(err) {
        if (err) {
            return next(err);
        }

        var appModel = _.clone(req.appMbaasModel);
        var host = fhconfig.value('mongo_userdb.host');
        var port = fhconfig.value('mongo_userdb.port');
        var replicaSet = fhconfig.value('mongo_userdb.replicaset_name');

        appModel.dbConf.name = appModel.domain + '_' + appModel.environment;
        appModel.dbConf.user = fhconfig.value('mongo_userdb.form_user_auth.user');
        appModel.dbConf.pass = fhconfig.value('mongo_userdb.form_user_auth.pass');
        appModel.dbConf.host = host;
        appModel.dbConf.port = port;

        req.uri = mongoUtils.buildConnectionString(appModel.dbConf, host, replicaSet);

        return next();
    });
}


exports.fixFormDbUrl = fixFormDbUrl;
