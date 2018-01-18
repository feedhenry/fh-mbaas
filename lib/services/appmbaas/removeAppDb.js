'use strict';
const ditchhelper = require('../../util/ditchhelper.js');
const config = require('fh-mbaas-middleware').config();
const logger = require('../../util/logger').getLogger();
const mongoUtils = require('../../util/mongo.js');
const _ = require('underscore');

/**
 * removeAppDb is responsible for removing the data and db associated with an app in a given environment.
 * @param mongo {Object}
 * @param domain {string}
 * @param appModel {Object}
 * @param environment {string}
 * @param next {function}
 */
module.exports = function removeAppDb(mongo, domain, appModel, environment, next) {
  if (!appModel.migrated && appModel.type !== 'openshift3') {
    // Call ditch to remove collection
    ditchhelper.removeAppCollection(appModel.name, function complete(err, result) {
      if (err) {
        return next(new Error('Error when try to remove db for app ' + appModel.name, err));
      }
      logger.debug({ app: appModel.name, result: result }, 'App collections removed');
      removeAppModel(appModel, next);
    });
  } else {
    // App has a per-app db (either migrated or created by default)
    // Remove from mongo directly
    var dbConf = appModel.dbConf;

    var configClone = _.clone(config);
    if (mongoUtils.hasUserSpaceDb()) {
      configClone.mongoUrl = config.mongoUserUrl;
      configClone.mongo = config.mongo_userdb;
    }

    mongo.dropDb(configClone, dbConf.user, dbConf.name, function complete(err) {
      if (err) {
        return next(new Error('Request to remove db for app ' + appModel.name, err));
      }
      logger.debug({ app: appModel.name }, 'App database is removed');
      removeAppModel(appModel, next);
    });
  }
};

function removeAppModel(appModel, next) {
  appModel.remove(function complete(err,removed) {
    if (err) {
      return next(new Error('Removing app mbaas instance ' + err.message));
    } else {
      next(undefined, removed);
    }
  });
}
