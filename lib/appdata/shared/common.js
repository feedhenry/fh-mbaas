const path = require('path');
const TarWrapper = require('./tarwrapper/tarwrapper').TarWrapper;
const fs = require('fs');
const zlib = require('zlib');

const CONSTANTS = require('./constants');

const util = require('util');

const async = require('async');

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

/**
 * Connect on the specified host and execute a query to get the host with the specified role
 * @param host host to connect to
 * @param port port
 * @param role role to be searched
 * @param cb
 * @private
 */
function _getMongoHost(host, port,role, cb) {
  const Mongo = require('./mongowrapper/mongoCommand').Mongo;
  new Mongo()
    .withQuiet()
    .withHost(host)
    .withPort(port)
    .withEval(util.format("this.rs.status().members && this.rs.status().members.filter(function (x) { return x.stateStr === '%s' })[0].name", role))
    .run(function(err, process) {
      if (err) {
        return cb(err);
      }

      var result = {
        port: CONSTANTS.MONGO_DEFAULT_PORT
      };

      var stdout = '';
      process.stdout.on('data', function(data) {
        stdout += data.toString();
      });

      process.on('close', function(code) {
        if (code === 0) {
          // read host from stdout
          if (stdout.trim().length === 0) {
            return cb(null, {host: host, port: port});
          }

          if (stdout.indexOf(":") > 0) {
            var parts = stdout.split(":");
            result.host = parts[0].trim();
            result.port = parts[1].trim();
          } else {
            result.host = stdout.trim();
          }
          return cb(null, result);
        }
        return cb(new Error(util.format('Unable to detect %s instance from host %s:%d', role, host, port)));
      })
        .on('error', function(err) {
          return cb(new Error(err));
        });
    });
}

/**
 * Detect which server has the specified role
 * @param hostList comma separated list of hosts
 * @param port port
 * @param role role we are searching for
 * @param cb
 */
function getMongoHost(hostList, port,role, cb) {
  var hosts = hostList.split(',');

  var detectedHost = undefined;

  async.everyLimit(hosts, 1, function(host, callback) {

    _getMongoHost(host, port, role, function(err, master) {
      if (err) {
        // server with specified role not found. Try next host.
        return callback(true);
      } else {
        detectedHost = master;
        // interrupt the loop
        callback(false);
      }
    });
  }, function(notFound) {
    if (notFound) {
      return cb('Unable to detect ' + role + ' instance');
    }

    cb(null, detectedHost);
  });
}
module.exports.extractTarFile = extractTarFile;
module.exports.gunzip = gunzip;
module.exports.getMongoHost = getMongoHost;
