const path = require('path');
const TarWrapper = require('./tarwrapper/tarwrapper').TarWrapper;
const fs = require('fs');
const zlib = require('zlib');

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

/**
 * GUnzip the specified file.
 * As per standard gunzip behaviour, the '.gz' extension is stripped off to get the original file name.
 *
 * @param folder folder that contains the file to be gunzipped and will contain the destination file.
 * @param file file to be gunzipped,
 * @param cb
 */
function gunzip(folder, file, cb) {
  var inFile = path.join(folder, file);
  fs.exists(inFile, function(exists) {
    if (!exists) {
      return cb(new Error('Unable to find file at "' + inFile + '"'));
    }
    var outFile = file.slice(0, -3);
    var gzReadStream = fs.createReadStream(path.join(folder, file));
    var writeStream = fs.createWriteStream(path.join(folder, outFile));

    var gunzip = zlib.createGunzip();
    gzReadStream.pipe(gunzip);
    gunzip.pipe(writeStream);

    gunzip.on("end", function() {
      return cb(null, outFile);
    }).on("error", function(err) {
      cb(err);
    });
  });
}


module.exports.extractTarFile = extractTarFile;
module.exports.gunzip = gunzip;