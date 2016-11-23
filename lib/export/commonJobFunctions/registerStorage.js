var storage = require('../../storage');
/**
 * Common function to register a file for export
 * @param context
 * @param cb
 */
module.exports = function registerStorage(context, cb) {

  // Wrap the callback so that progress is automatically sent
  cb = context.progress.wrappCallback(cb);

  var logger = context.logger;
  logger.info('Registering file into the storage', {path: context.archive.path});
  storage.registerFile(context.archive.path, function(err, fileModel) {
    if (err) {
      logger.error('Failed registering into the storage', {path: context.archive.path, err: err});
      return cb(err);
    }

    context.archive.fileId = fileModel.id;
    return cb(null, context);
  });
};