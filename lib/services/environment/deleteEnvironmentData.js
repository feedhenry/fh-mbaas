'use strict';

const async = require('async');
const mongo = require('../../util/mongo.js');
const fhmbaasMiddleware = require('fh-mbaas-middleware');
const getDeployedApps = require('../../services/appmbaas/listDeployedApps');
const removeAppDb = require('../../services/appmbaas/removeAppDb.js');
const logger = require('../../util/logger').getLogger();
/**
 * deleteEnvironmentData will remove the app databases and the environment database associated with an environment
 * @param domain {string}
 * @param environment {string}
 * @param callback    {function}
 */
module.exports = function deleteEnvironmentData(domain, environment, callback) {
  async.waterfall([
    function getApps(callback) {
      getDeployedApps(domain, environment, callback);
    },
    function removeAppDbs(apps, callback) {
      if (!apps || apps.length === 0) {
        return callback();
      }
      var errors = [];
      function removeCallback(app, callback) {
        return function(err) {
          if (err) {
            logger.error("error removing appdb ", app);
            //collect our error and continue removing dbs
            errors.push(err);
          }
          return callback();
        };
      }
      async.each(apps, function removeDb(app, cb) {
        removeAppDb(mongo, domain, app, environment, removeCallback(app, cb));
      }, function done(err) {
        if (err) {
          return callback(err);
        }
        if (errors.length !== 0) {
          return callback(errors);
        }
        return callback();
      });
    },
    function removeEnvironmentDb(callback) {
      fhmbaasMiddleware.envMongoDb.dropEnvironmentDatabase(domain, environment, callback);
    }
  ], callback);
};
