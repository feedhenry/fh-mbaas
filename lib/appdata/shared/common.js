const path = require('path');
const TarWrapper = require('./tarwrapper/tarwrapper').TarWrapper;
const fs = require('fs');
const zlib = require('zlib');

const CONSTANTS = require('./constants');
const exec = require('child_process').exec;

const util = require('util');

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

function getMongoHost(host, port,role, cb) {

  var command = [
    'mongo',
    ' --quiet',
    ' --host ', host,
    ' --port ', port,
    ' --eval ', util.format('"this.rs.status().members && this.rs.status().members.filter(function (x) { return x.stateStr === \'%s\' })[0].name"', role)
  ].join('');

  exec(command, function(err, stdout, stderr) {
    if (err) {
      return cb(err);
    }

    // If the mongo db does not have replica sets, an error will
    // be written to stderr.
    if (stderr || !stdout) {
      return cb(null, {host: host, port: port});
    }

    var result = {
      port: CONSTANTS.MONGO_DEFAULT_PORT
    };

    // URL can also contain the port. Can't use `url#parse` here because its
    // not a complete URL.
    if (stdout.indexOf(":") > 0) {
      var parts = stdout.split(":");
      result.host = parts[0].trim();
      result.port = parts[1].trim();
    } else {
      result.host = stdout.trim();
    }

    return cb(null, result);
  });
}

module.exports.extractTarFile = extractTarFile;
module.exports.gunzip = gunzip;
module.exports.getMongoHost = getMongoHost;