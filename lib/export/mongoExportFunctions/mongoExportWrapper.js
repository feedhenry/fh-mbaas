var mongoDbUri = require('mongodb-uri');
const zlib = require('zlib');
var child_process = require('child_process');
var path = require('path');
const fs = require('fs');

var getSecondaryReplSetHost = require('./getSecondaryReplSetHost');

const CONSTANTS = require('./constants');

/**
 * This function spawns the mongodump command to export each single collection composing the application data.
 * @param context the export operation context
 * @param collectionName the name of the collection to be exported
 * @param targetFileName the file to export to
 * @param cb
 */
module.exports = function mongoExportWrapper(context, collectionName, targetFileName, cb) {
  var logger = context.logger;

  var uriObject = mongoDbUri.parse(context.uri);

  logger.info('Exporting collection', {name: collectionName});

  getSecondaryReplSetHost(function(err, result) {
    if (err) {
      logger.error('Error querying replica sets', {err: err});
      return cb(err);
    }

    // If we are in a setup with replica sets the host variable will be set to
    // the host of the secondary instance. We prefer to run mongodump there. If
    // it is not set we just use the host from the URL.
    var dumpHost = (result && result.host) || uriObject.hosts[0].host;
    var dumpPort = (result && result.port) || uriObject.hosts[0].port || CONSTANTS.MONGO_DEFAULT_PORT;

    logger.info('Using host ' + dumpHost + ':' + dumpPort + ' to run mongodump');

    var mongodump = child_process.spawn('mongodump',
      [
        '--host', dumpHost,

        // Use the Mongodb default port if the uri does not contain any port information
        // This is in line with the Mongodb connection string format:
        // https://docs.mongodb.com/manual/reference/connection-string/
        '--port', dumpPort,
        '-u', uriObject.username,
        '-p', uriObject.password,
        '-d', uriObject.database,
        '-c', collectionName,
        '-o', '-'
      ]);

    var targetFilePath = path.join(context.path, targetFileName);
    var outStream = fs.createWriteStream(targetFilePath);

    var gzip = zlib.createGzip();

    //Listening for the close event on the file stream, as the pipe chain can only be considered complete when all files are written to disk
    //If an attempt to tar the gz files as they are changing, it will cause error code 1 (See https://www.gnu.org/software/tar/manual/html_section/tar_19.html)
    outStream.on('close', function() {
      logger.info('Collection exported', {collectionName: collectionName});

      //Flush may be redundant here as the stream has completed all the way to disk and the file handle has closed.
      gzip.flush(function() {
        context.archive.gzipFiles.push(targetFileName);
        return cb(null);
      });

    }).on('error', function(err) {
      logger.error('Error exporting collection', {collectionName: collectionName, err: err});
      return cb(err);
    });

    //Piping after registering events in case of an immediate emittion of an error.
    mongodump.stdout.pipe(gzip).pipe(outStream);
  });
};
