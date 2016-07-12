/**
 * Common module to update storage data associated with an export
 * @param context
 * @param cb
 */
module.exports = function updateModelWithStorageData(context, cb) {
  // Wrap the callback so that progress is automatically sent
  cb = context.progress.wrappCallback(cb);

  var logger = context.logger;
  logger.info('Storing storage pointer inside the job model', {fileId: context.archive.fileId});
  var exportJob = context.jobModel;
  exportJob.updateMetadata("fileId", context.archive.fileId);
  exportJob.save(function(err) {
    if (err) {
      logger.error('Failed storing storage pointer inside the job model', {path: context.archive.fileId, err: err});
    }

    return cb(err);
  });
};