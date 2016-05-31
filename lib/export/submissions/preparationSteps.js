var async = require('async');
var fhMbaasMiddleware = require('fh-mbaas-middleware');
var common = require('../../util/common');


/**
 *
 * Getting the mongo config for the environment database
 *
 * @param context
 * @param context.exportJob
 * @param context.logger
 * @param cb
 */
function getEnvDbConf(context, cb) {
  var logger = context.logger;
  var subExportJob = context.exportJob;

  //fh-mbaas-middleware is responsible for storing all of the environment database configuration
  var models = fhMbaasMiddleware.models.getModels();
  models.Mbaas.findOne({
    domain: subExportJob.domain,
    environment: subExportJob.environment
  }, function(err, envDb) {
    if (err) {
      logger.warn("Error getting environment database", err);
    }

    //If there is no environment database, there can be no submissions. No point in exporting then.
    if (!envDb) {
      return cb("No Environment Database available for environment " + subExportJob.environment + " and domain " + subExportJob.domain);
    }

    //The mongo connection string for the environment database.
    context.uri = common.formatDbUri(envDb.dbConf || {});

    return cb(err, context);
  });
}

/**
 * Preparation steps for submission export
 *
 * @param context
 * @param cb
 */
function prepare(context, cb) {

  //For submission export, we will already know the collections that need to be exported
  context.collections = ["formsubmissions", "fileStorage.files", "fileStorage.chunks"];

  async.waterfall([
    async.apply(getEnvDbConf, context)
  ], cb);
}

module.exports.prepare = prepare;
