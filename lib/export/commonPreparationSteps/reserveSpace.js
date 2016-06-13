var async = require('async');
var diskspace = require('diskspace');
var baseJobSchema = require("../../models/BaseImportExportJobSchema")();
var jobStates = baseJobSchema.statuses;
var jobTypes = baseJobSchema.types;

function retrieveTotalReservedSpace(context, job, cb) {
  var logger = context.logger;
  logger.info('Retrieving already allocated space');
  job.aggregate([{
    $match: {
      $and: [{
        $or: [{status: jobStates.INPROGRESS}, {status: jobStates.QUEUED}]
      }, {
        jobType: jobTypes.EXPORT
      }]
    }
  }, {
    $group: {
      _id: null,
      total: {$sum: "$metadata.fileSize"}
    }
  }], function(err, result) {
    if (err) {
      return cb(err);
    }

    return cb(null, result[0] ? result[0].total : 0);
  });
}

/**
 * Reserve the space for the export by setting the size attribute inside the task object.
 *
 * @param job the Job type (App or Submission)
 * @param context an object containing the details of the app to be exported:
 *   - db : connection to the app mongo database
 *   - collections : the names of the collections owned by the application.
 *   - size : total size in byte of the application collections
 *   INPUT: context  {exportJob:exportJob,db: mongoConnection, collections: appCollections, size: totalSize}
 *   OUTPUT:  err, context {exportJob:exportJob,db: mongoConnection, collections: appCollections, size: totalSize }
 * @param cb the callback
 */
function reserveSpaceIfAvailable(job, context, cb) {

  // Wrap the callback so that progress is automatically sent
  cb = context.progress.wrappCallback(cb);

  var logger = context.logger;
  logger.info('Reserving space');
  var outDir = context.outputDir;

  async.waterfall(
    [
      async.apply(retrieveTotalReservedSpace, context, job),
      function(totalReservedSpace, callback) {
        diskspace.check(outDir, function(err, total, free) {
          if (err) {
            return callback(err);
          }
          callback(null, free - totalReservedSpace);
        });
      }
    ], function(err, freeSpace) {
    if (err) {
      logger.error('Error detecting free space', err);
      return cb(err);
    }
    if (freeSpace < context.size) {
      return cb('No enough free space. Required: ' + context.size + ' available : ' + freeSpace);
    }
      // Reserve free space...
    var exportJob = context.jobModel;

    exportJob.updateMetadata("fileSize", context.size);
    exportJob.save(function(err) {
      if (err) {
        logger.error('Error updating export size to the database', {err: err});
      }
      return cb(err, context);
    });

  }
  );
}

module.exports = reserveSpaceIfAvailable;
