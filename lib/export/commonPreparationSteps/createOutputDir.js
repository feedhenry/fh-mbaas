var mkdirp = require('mkdirp');

/**
 * Creates the export directory to be used to save the exported files.
 *
 * @param context
 * @param cb the callback
 */
function createOutputDir(context, cb) {

  // Wrap the callback so that progress is automatically sent
  cb = context.progress.wrappCallback(cb);

  var logger = context.logger;
  logger.info('Creating output directory', context.outputPath);
  mkdirp(context.outputPath, function(err) {
    if (err) {
      return cb(err);
    }

    context.path = context.outputPath;
    return cb(err, context);
  });
}

module.exports = createOutputDir;
