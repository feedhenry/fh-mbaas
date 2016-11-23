var async = require('async');
var ditchhelper = require('../util/ditchhelper');
var AppdataJob = require('../models').AppdataJob;
var path = require('path');
var common = require('../util/common');
var dfutils = require('../util/dfutils');
var _ = require('underscore');
var commonPreparationSteps = require('./commonPreparationSteps');

/**
 * This function retrieves the connection data for a given application.
 * If the application has been already migrated, the connection data is inside the appInfo object, otherwise
 * a fh-ditch endpoint must be called.
 * INPUT: {appInfo: appInfo, exportJob: exportJob}
 * OUTPUT: {appInfo: appInfo, exportJob: exportJob, uri: mongoURI, collections: appCollections}
 * @param context the context of the execution: {appInfo: appInfo}
 * @param cb the callback
 * @returns {*}
 */
function retrieveConnectionData(context, cb) {
  var appInfo = context.appInfo;
  var logger = context.logger;

  logger.info('Retrieving database connection data');

  // getting database connection info
  if (appInfo.dbConf) {
    context.uri = common.formatDbUri(appInfo.dbConf);
    return cb(null, context);
  } else {
    logger.info("App Not migrated. Invoking fh-ditch");
    return ditchhelper.getAppInfo(appInfo.name, function(err, data) {
      if (err) {
        logger.error('Error invoking ditch', {err: err});
        return cb(err, context);
      }
      logger.debug('Answer from ditch received', {data: data});
      context.uri = data.uri;
      context.collections = data.collections;
      return cb(null, context);
    });
  }
}

/**
 * Retrieve, if needed (migrated apps) the names of the callections composing the app.
 *
 * @param context an object containing the details of the app to be exported:
 *   - appInfo: the application info object
 *   - db : connection to the app mongo database
 *   - collections : the names of the collections owned by the application.
 *   - exportJob : a database object to be used to persist export info
 *   INPUT: context  {appInfo: self.appInfo, exportJob:exportJob, db: mongoConnection, collections: appCollections}
 *   OUTPUT:  err, context {appInfo: self.appInfo, exportJob: exportJob, db: mongoConnection, collections: appCollections }
 * @param cb the callback.
 */
function retrieveCollectionsNames(context, cb) {
  var logger = context.logger;
  logger.info('Retrieving collections names');
  if (!context.appInfo.migrated) {

    // If the app is not migrated, the list of collections has already been returned by ditch (#retrieveConnectionData)
    if (context.collections.length === 0) {
      return cb('No collection found for app' + context.appInfo.name, context);
    } else {
      return cb(null, context);
    }
  }

  var db = context.db;
  db.listCollections().toArray(function(err, collections) {
    if (err) {
      return cb(err);
    }

    context.collections = [];

    _.each(collections, function(obj) {
      if (obj.name.indexOf('system.') !== 0) {
        context.collections.push(obj.name);
      }
    });

    logger.debug('Collections retrieved', {collections: context.collections});

    if (context.collections.length === 0) {
      cb('No collection found for app' + context.appInfo.name, context);
    } else {
      cb(null, context);
    }
  });
}

function initializeProgress(context, cb) {
  // We send a progress event before and after each collection: context.collections.length * 2
  // We still have 4 preparation steps and 3 steps after the export
  context.progress.total = context.collections.length * 2 + 7;

  cb(null, context);
}

/**
 * Creates a path specific to app exports and adds the path to the context
 */
function addOutputPathToContext(context, cb) {
  var appInfo = context.appInfo;
  var parent = context.outputDir;
  context.outputPath = path.join(parent, appInfo.guid, appInfo.environment, context.jobID);
  cb(null, context);
}

/**
 * Check the value of the `stopApp` parameter and if it is set to `true`
 * use dfc to stop the app before running the export. This is to prevent
 * users from adding new data while the export is running.
 *
 * @param context
 * @param cb
 */
function stopApp(context, cb) {
  var exportJob = context.jobModel;

  // wrap the callback so that the progress is sent automatically
  cb = context.progress.wrappCallback(cb);

  var stopApp = exportJob.metadata.stopApp
    , domain = exportJob.domain
    , env = exportJob.environment
    , appid = exportJob.appid;

  if (stopApp) {
    // dfc expects the app name to be the combination of
    // <DOMAIN>-<APP_ID>-<ENVIRONMENT>
    var appName = [domain, appid, env].join("-");

    context.logger.info('Stopping ' + appName + ' before running export');

    dfutils.stopApp(domain, env, appName, function(err) {
      if (err) {
        return cb(err);
      }

      return cb(null, context);
    });
  } else {

    return cb(null, context);
  }
}

/**
 * Implements the preparation steps flow.
 *
 * @param context the application data export context
 * @param cb
 */
function prepare(context, cb) {
  async.waterfall([
    async.apply(retrieveConnectionData, context),
    commonPreparationSteps.connectToDatabase,
    retrieveCollectionsNames,
    initializeProgress,
    commonPreparationSteps.retrieveCollectionsSize,
    async.apply(commonPreparationSteps.reserveSpaceIfAvailable, AppdataJob),
    addOutputPathToContext,
    commonPreparationSteps.createOutputDir,
    stopApp
  ], function(err) {
    return cb(err, context);
  });
}

module.exports.prepare = prepare;
