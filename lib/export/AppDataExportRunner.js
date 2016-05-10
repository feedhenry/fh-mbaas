var fhConfig = require('fh-config');
var logger = fhConfig.getLogger();
var EventEmitter = require('events').EventEmitter;
var ditchhelper = require('../util/ditchhelper');
var util = require('util');
var constants = require('./constants');
var _ = require('underscore');
const fs = require('fs');
const common = require('../util/common');
var mkdirp = require('mkdirp');
var mongoDbUri = require('mongodb-uri');
var path = require('path');
var sys = require('sys');
var exec = require('child_process').exec;

var ExportJobSchema = require('../models/ExportJobSchema');
var ExportJob = require('../models').ExportJob;

var diskspace = require('diskspace');

var async = require('async');
var MongoClient = require('mongodb').MongoClient;

const STATUS_EVENT = require('../jobs/progressPublisher').STATUS_EVENT;
const PROGRESS_EVENT = require('../jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('../jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('../jobs/progressPublisher').FAIL_EVENT;
const HEARTBEAT_EVENT = 'heartbeat';

function AppDataExportRunner(jobID, appInfo, exportJob, outputDir, keepalive){
  EventEmitter.call(this);
  this.appInfo = appInfo;
  this.exportJob = exportJob;
  this.outputDir = outputDir;
  this.jobID = jobID;
  this.keepalive = keepalive ? keepalive : 30000;
}

util.inherits(AppDataExportRunner, EventEmitter);

AppDataExportRunner.prototype.run = function(){

  logger.info('[APPDATAEXPORT] Application export started');

  if (!this.appInfo) {
    logger.warn('[APPDATAEXPORT] Application not found. Aborting');

    this.emit(FAIL_EVENT, 'Export failed. Application not found');
    return;
  }

  if(this.status === constants.STATUS.FINISHED || this.status === constants.STATUS.FAILED){
    logger.info('[APPDATAEXPORT] Application export finished');
    this.emit(STATUS_EVENT, this.appInfo, this.status);
    return;
  }
  if(this.status === constants.STATUS.INPROGRESS){
    logger.info('[APPDATAEXPORT] Export already in progress, aborting');

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

    logger.info("[APPDATAEXPORT] App Not migrated. Invoking fh-ditch");
    return ditchhelper.getAppInfo(appInfo.name, function (err, data) {
      if (err) {
        logger.error('[APPDATAEXPORT] Error invoking ditch', {err: err, appid: appInfo.guid});
        return cb(err, context);
      }
      logger.debug('[APPDATAEXPORT] Answer from ditch received', {data : data, appid: appInfo.guid});
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
  logger.info('[APPDATAEXPORT] Connecting to app database', {uri: context.uri});
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

    context.collections = [];

    _.each(collections, function(obj, index, ary) {
      if (obj.name.indexOf('system.') !== 0) {
        context.collections.push(obj.name);
      }
    });

    logger.debug('[APPDATAEXPORT] Collections retrieved', {collections: context.collections});

    if (context.collections.length === 0) {
      cb('No collection found for app' + context.appInfo.name, context);
    } else {
      cb(null, context);
    }
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

  context.size = 0;

  async.eachLimit(context.collections, 10, function(collectionName, callback) {
    context.db.collection(collectionName).stats(function(err,st) {
      if (err) {
        logger.error('[APPDATAEXPORT] Failure getting collection size', {collectionName: collectionName, err: err});
      } else {
        context.size += st.size;
      }
      callback(err);
    });
  }, function (err) {
    logger.info('[APPDATAEXPORT] Estimated export size', {size: context.size});
    return cb(err, context);
  });
}

function retrieveTotalReservedSpace(cb) {
  ExportJob.aggregate([
      {
        $match: {
          $or: [ {status: 'exporting'}, {status:'created'}]
        }
      },
      {
        $group: {
          _id: null,
          total: {$sum: "$fileSize"}
        }
      }
    ], function (err, result) {
      if (err) {
        return cb(err);
      }

    return cb (null, result[0] ? result[0].total : 0);
    }
  );
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

  async.waterfall(
    [
      retrieveTotalReservedSpace,
      function (totalReservedSpace, callback) {
        diskspace.check(outDir, function (err, total, free, status) {
          if (err) {
            return callback(err);
          }
          callback(null, free - totalReservedSpace);
        });
      }
    ], function (err, freeSpace) {
      if (err) {
        logger.error('[APPDATAEXPORT] Error detecting free space', err);
        cb(err);
      }
      if (freeSpace < context.size) {
        return cb('No enought free space. Required: ' + context.size + ' available : ' + freeSpace);
      }
      // Reserve free space...
      var exportJob = context.exportJob;

      exportJob.fileSize = context.size;

      exportJob.save(function(err) {
        if (err) {
          logger.error('[APPDATAEXPORT] Error updating export size to the database', {appInfo: context.appInfo, err: err});
        }
        return cb(err, context);
      });

    }

  );
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
  var outputPath = path.join(parent, appInfo.guid, appInfo.environment, context.jobID);
  mkdirp(outputPath, function(err) {
    if (err) {
      return cb(err);
    }

    context.path = outputPath;
    return cb(err, context);
  });
}

function mongoExportWrapper(emitter, context, collectionName, index, total, cb) {
  emitter.emit (PROGRESS_EVENT, 'exporting', index, total);

  var uriObject = mongoDbUri.parse(context.uri);

  var command = util.format('mongodump --host %s --port %d -u %s -p %s -d %s -c %s -o - | gzip > %s/%s',
    uriObject.hosts[0].host, uriObject.hosts[0].port, uriObject.username, uriObject.password, uriObject.database, collectionName, context.path, collectionName + '.bson.gz');

  logger.info('[APPDATAEXPORT] Exporting collection', {name: collectionName, index: index, total: total});
  logger.debug('[APPDATAEXPORT] Executing command', command);

  // TODO: change this to child_process.spawn
  exec(command, function(err) {
    if (!err) {
      logger.info('[APPDATAEXPORT] Collection exported', {name: collectionName, progress:index, total: total});
    } else {
      logger.error('[APPDATAEXPORT] Failed exporting collection', {name: collectionName, progress:index, total: total, command: command});
    }
    return cb(err);
  });
}

function performExport(context, cb) {
  var self = this;
  var index = 0;
  var total = context.collections.length;
  async.eachSeries(context.collections, function(collectionName, cb) {
    self.emit (PROGRESS_EVENT, 'exporting', ++index, total);
    mongoExportWrapper(self, context, collectionName, index, total, cb);
  }, function(err, results) {
    if (!err) {
      // Creating a tar file with all the exported data and delete them
      var tarCommand = 'cd %s && tar cf export.tar *.gz && rm *.gz';
      var command = util.format(tarCommand, context.path);

      async.series([
        async.apply(exec, command),
        async.apply(fs.stat, path.join(context.path, 'export.tar'))
      ], function (err, stats) {
        if (!err) {
          context.archive = {
            path: path.join(context.path, 'export.tar'),
            size: stats.size
          };

          // updating job data
          var exportJob = context.exportJob;
          exportJob.filePath = context.path;
          exportJob.fileSize = context.size;

          exportJob.save(function(err) {
            if (err) {
              logger.error('[APPDATAEXPORT] Error updating file and size in mongo', {err: err});
            }
            return cb(err, context);
          });
        } else {
          return cb(err, context);
        }
      });
    } else {
      return cb(err, context);
    }
  });
}

function startExport() {
  var self = this;
  self.interval = this.heartbeat();
  var context = {appInfo: self.appInfo, exportJob: self.exportJob, jobID: self.jobID};

  async.waterfall([
    async.apply(retrieveConnectionData, context),
    connectToDb,
    retrieveCollectionsNames,
    retrieveAppCollectionsSize,
    async.apply(reserveSpaceIfAvailable, self.outputDir),
    async.apply(createOutputDir, self.outputDir),

    // Real export
    performExport.bind(self)
  ], function (err) {
    if (self.interval) {
      clearInterval(self.interval);
    }
    if(err) {
      logger.error('[APPDATAEXPORT] Export failed', {app: context.appInfo, err: err});
      self.emit(FAIL_EVENT, this.appInfo, err);
    } else {
      logger.info('[APPDATAEXPORT] Export finished', {app: context.appInfo});
      self.emit(FINISH_EVENT, this.appInfo, 'Export finished');
    }

    cleanUp(context, function(cleanUpError) {
      if (cleanUpError) {
        logger.error('[APPDATAEXPORT] Error cleaning up after exporting', {app: context.appInfo, err: cleanUpError});
      } else {
        logger.info('[APPDATAEXPORT] Cleanup executed', {app: context.appInfo});
      }
    });
  });
}

function cleanUp(context, cb) {

  if (context.db) {
    // close the database...
    context.db.close(function(err) {
      if (err) {
        logger.error('[APPDATAEXPORT] Error cleaning up', {app: context.appInfo, err: err});
      }

      return cb(err);
    });
  } else {
    // If the DB is not connected there is nothing to clean up
    return cb();
  }
}

AppDataExportRunner.prototype.heartbeat = function() {
  var self = this;
  return setInterval(function() {
    self.emit(HEARTBEAT_EVENT);
  }, self.keepalive);
};

module.exports.AppExportRunner = AppDataExportRunner;
module.exports.HEARTBEAT_EVENT = HEARTBEAT_EVENT;
