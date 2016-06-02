const path = require('path');
const TarWrapper = require('./tarwrapper/tarwrapper').TarWrapper;

/**
 * Extract a tar file
 *
 * @param context the context of the operation. It must have at least following fields:
 * context = {
 *   input: {
 *      folder: 'folder where extraction will be performed'
 *      path : 'path to the file to be extracted'
 *   }
 * }
 * @param cb
 */
function extractTarFile(context, cb) {
  var filepath = context.input.path;
  var logger = context.logger;

  context.input.folder = path.dirname(filepath);

  logger.info('Extracting file %s in %s folder', filepath, context.input.folder);

  new TarWrapper(filepath)
    .extract()
    .withCWD(context.input.folder)
    .run()
    .on('close', function(code) {
      if (code === 0) {
        return cb(null, context);
      }
      return cb(new Error('Error executing tar command. Return code : ' + code), context);
    })
    .on('error', function(err) {
      return cb(new Error(err), context);
    });
}

module.exports.extractTarFile = extractTarFile;