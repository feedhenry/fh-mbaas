var fhConfig = require('fh-config');
var logger = fhConfig.getLogger();
var EventEmitter = require('events').EventEmitter;
var ditchhelper = require('../util/ditchhelper');
var util = require('util');
var constants = require('./constants');
var _ = require('underscore');
const fs = require('fs');

var diskspace = require('diskspace');

var async = require('async');
var MongoClient = require('mongodb').MongoClient;

const STATUS_EVENT = require('lib/jobs/progressPublisher').STATUS_EVENT;
const PROGRESS_EVENT = require('lib/jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;

function AppExportRunner(jobID, appInfo, exportJob, outputDir){
  EventEmitter.call(this);
  this.appInfo = appInfo;
  this.status = this.appInfo.status;
  this.progress = this.appInfo.progress;
  this.exportJob = exportJob;
  this.outputDir = outputDir;
  this.jobID = jobID;
}

util.inherits(AppExportRunner, EventEmitter);

AppExportRunner.prototype.run = function(){

  logger.info('[APPEXPORT] Application export started');

  if(this.status === constants.STATUS.FINISHED || this.status === constants.STATUS.FAILED){
    logger.info('[APPEXPORT] Application export finished');
    this.emit(STATUS_EVENT, this.appInfo, this.status);
    return;
  }
  if(this.status === constants.STATUS.INPROGRESS){
    logger.info('[APPEXPORT] Export already in progress, aborting');

    this.emit(FAIL_EVENT, 'Export failed due to error: ' + err);
    return;
  }

  startExport.bind(this)();
};

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

  // getting database connection info
  if (appInfo.dbConf) {
    context.uri = common.formatDbUri(appInfo.dbConf);
    return cb(null, context);
  } else {
    return ditchhelper.getAppInfo(appInfo.appName, function (err, data) {
      if (err) {
        return cb(err, context);
      }
      context.uri = data.uri;
      context.collections = data.collections;
      return cb(null, context);
    });
  }
}

/**
 * Connects to the application database.
 *
 * @param context an object containing the details of the app to be exported:
 *   - appInfo: the application info object
 *   - mongoUri : the URI to be used to connect to the mongo db
 *   - collections : the name of the collections owned by the application.
 *   - exportJob : a database object to be used to persist export info
 *   This is already populated if the application has not been migrated (they are returned by the fh-ditch endpoint)
 *   or is undefined otherwise.
 *   INPUT: context  {appInfo: self.appInfo, exportJob:exportJob, uri: mongoUri, collections: appCollections}
 *   OUTPUT:  err, context {appInfo: self.appInfo, exportJob: exportJob, uri: mongoUri, collections: appCollections, db: mongoDbConnection }
 * @param cb the callback.
 */
function connectToDb(context, cb) {
  MongoClient.connect(context.uri, function(err, db) {
    context.db = db;
    cb(err, context);
  });
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
  if (!context.appInfo.migrated) {
    return cb(null, context);
  }

  var db = context.db;
  db.collectionNames(function(err, collections) {
    if (err) {
      return cb(err);
    }

    var filteredCollections = _.filter(collections, function(collection) {
      return collection.indexOf(context.appInfo.name) !== -1;
    });

    context.collections = filteredCollections;
    cb(null, context);
  });

}

/**
 * Computes the total size of the app collections (in bytes).
 *
 * @param context an object containing the details of the app to be exported:
 *   - appInfo: the application info object
 *   - db : connection to the app mongo database
 *   - collections : the names of the collections owned by the application.
 *   - exportJob : a database object to be used to persist export info
 *   INPUT: context  {appInfo: self.appInfo, exportJob: exportJob, db: mongoConnection, collections: appCollections}
 *   OUTPUT:  err, context {appInfo: self.appInfo, exportJob:exportJob, db: mongoConnection, collections: appCollections, size: totalSize }
 * @param cb the callback
 */
function retrieveAppCollectionsSize(context, cb) {

  context.size = _.reduce(context.collections, function (memo, collectionName) {
    return memo + context.db.collection(collectionName).stats().size;
  }, 0);

  cb(null, context);
}

/**
 * Reserve the space for the export by setting the size attribute inside the task object.
 *
 * @param context an object containing the details of the app to be exported:
 *   - appInfo: the application info object
 *   - db : connection to the app mongo database
 *   - collections : the names of the collections owned by the application.
 *   - size : total size in byte of the application collections
 *   INPUT: context  {appInfo: self.appInfo, exportJob:exportJob,db: mongoConnection, collections: appCollections, size: totalSize}
 *   OUTPUT:  err, context {appInfo: self.appInfo, exportJob:exportJob,db: mongoConnection, collections: appCollections, size: totalSize }
 * @param cb the callback
 */
function reserveSpaceIfAvailable(outDir, context, cb) {
  diskspace.check(outDir, function (err, total, free, status) {
    if (err) {
      return cb(err);
    }

    if (free < context.size) {
      return cb('No enought free space. Required: ' + neededSpace + ' available : ' + free);
    }

    // Reserve free space...
    var exportJob = context.exportJob;

    exportJob.fileSize = context.size;

    exportJob.save(function(err) {
      if (err) {
        logger.error('[APPEXPORT] Error updating export size to the database', {appInfo: context.appInfo, err: err});
      }
      return cb(err, context);
    });
  });
}

/**
 * Creates the export directory to be used to save the exported files.
 *
 * @param parent parent directory
 * @param context
 * @param cb the callback
 */
function createOutputDir(parent, context, cb) {
  var appInfo = context.appInfo;
  var path = require('path').join(parent, appInfo.appGuid, appInfo.appEnv, context.jobID);
  fs.mkdir(path, function(err) {
    if (err) {
      return cb(err);
    }

    context.path = path;
    return cb(err, context);
  });
}

function startExport() {
  var self = this;

  var context = {appInfo: self.appInfo, exportJob: self.exportJob, jobID: self.jobID};

  async.waterfall([
    async.apply(retrieveConnectionData, context),
    connectToDb,
    retrieveCollectionsNames,
    retrieveAppCollectionsSize,
    async.apply(reserveSpaceIfAvailable, self.outputDir),
    async.apply(createOutputDir, self.outputDir)

    // HERE we should start the real export
  ], function (err, context) {

    if(err) {
      logger.error('[APPEXPORT] Export failed', {app: context.appInfo, err: err});
      self.emit(FAIL_EVENT, this.appInfo, err);
    } else {
      logger.info('[APPEXPORT] Export finished', {app: context.appInfo});
      self.emit(FINISH_EVENT, this.appInfo, 'Export finished');
    }

    cleanUp(context, function(cleanUpError) {
      if (cleanUpError) {
        logger.error('[APPEXPORT] Error cleaning up after exporting', {app: context.appInfo, err: cleanUpError});
      } else {
        logger.error('[APPEXPORT] Cleanup executed', {app: context.appInfo});
      }
    });
  });
}

function cleanUp(context, cb) {

  if (context.db) {
    // close the database...
    context.db.close(function(err) {
      if (err) {
        logger.error('[APPEXPORT] Error cleaning up', {app: context.appInfo, err: err});
      }

      return cb(err);
    });
  } else {
    // If the DB is not connected there is nothing to clean up
    return cb();
  }
}

module.exports.AppExportRunner = AppExportRunner;
