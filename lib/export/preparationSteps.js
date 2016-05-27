var async = require('async');
var ditchhelper = require('../util/ditchhelper');
var MongoClient = require('mongodb').MongoClient;
var AppdataJob = require('../models').AppdataJob;
var jobTypes = require("../models/AppdataJobSchema").types;
var jobStates = require("../models/AppdataJobSchema").statuses;
var diskspace = require('diskspace');
var path = require('path');
var mkdirp = require('mkdirp');
var common = require('../util/common');

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
    return ditchhelper.getAppInfo(appInfo.name, function (err, data) {
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
  var logger = context.logger;
  logger.info('Connecting to app database', {uri: context.uri});
  MongoClient.connect(context.uri, function (err, db) {
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
  var logger = context.logger;
  logger.info('Retrieving collections names');
  if (!context.appInfo.migrated) {
    if (context.collections.length === 0) {
      return cb('No collection found for app' + context.appInfo.name, context);
    } else {
      return cb(null, context);
    }
  }

  var db = context.db;
  db.collectionNames(function (err, collections) {
    if (err) {
      return cb(err);
    }

    context.collections = [];

    _.each(collections, function (obj, index, ary) {
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
  var logger = context.logger;
  logger.info('Retrieving collections size');
  context.size = 0;

  async.eachLimit(context.collections, 10, function (collectionName, callback) {
    context.db.collection(collectionName).stats(function (err, st) {
      if (err) {
        logger.error('Failure getting collection size', {collectionName: collectionName, err: err});
      } else {
        context.size += st.size;
      }
      callback(err);
    });
  }, function (err) {
    logger.info('Estimated export size', {size: context.size});
    return cb(err, context);
  });
}

function retrieveTotalReservedSpace(context, cb) {
  var logger = context.logger;
  logger.info('Retrieving already allocated space');
  AppdataJob.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [{status: jobStates.INPROGRESS}, {status: jobStates.QUEUED}]
            },
            {
              jobType: jobTypes.EXPORT
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: {$sum: "$metadata.fileSize"}
        }
      }
    ], function (err, result) {
      if (err) {
        return cb(err);
      }

      return cb(null, result[0] ? result[0].total : 0);
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
function reserveSpaceIfAvailable(context, cb) {
  var logger = context.logger;
  logger.info('Reserving space');
  var outDir = context.outputDir;
  async.waterfall(
    [
      async.apply(retrieveTotalReservedSpace, context),
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
        logger.error('Error detecting free space', err);
        return cb(err);
      }
      if (freeSpace < context.size) {
        return cb('No enought free space. Required: ' + context.size + ' available : ' + freeSpace);
      }
      // Reserve free space...
      var exportJob = context.exportJob;

      exportJob.updateMetadata("fileSize", context.size);
      exportJob.save(function (err) {
        if (err) {
          logger.error('Error updating export size to the database', {err: err});
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
function createOutputDir(context, cb) {
  var logger = context.logger;
  var appInfo = context.appInfo;
  var parent = context.outputDir;

  logger.info('Creating output directory', {
    parent: parent,
    guid: appInfo.guid,
    env: appInfo.environment,
    jobID: context.jobID
  });

  var outputPath = path.join(parent, appInfo.guid, appInfo.environment, context.jobID);
  mkdirp(outputPath, function (err) {
    if (err) {
      return cb(err);
    }

    context.path = outputPath;
    return cb(err, context);
  });
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
    connectToDb,
    retrieveCollectionsNames,
    retrieveAppCollectionsSize,
    reserveSpaceIfAvailable,
    createOutputDir
  ], function (err) {
    return cb(err, context);
  });
}

module.exports.prepare = prepare;