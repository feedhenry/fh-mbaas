var mongoDbUri = require('mongodb-uri');
const zlib = require('zlib');
var child_process = require('child_process');
var path = require('path');
const fs = require('fs');

var getSecondaryReplSetHost = require('./getSecondaryReplSetHost');

const PROGRESS_EVENT = require('../../jobs/progressPublisher').PROGRESS_EVENT;
const STATUSES = require('../../models/AppdataJobSchema').statuses;

const CONSTANTS = require('./constants');

/**
 * This function spawns the mongodump command to export each single collection composing the application data.
 * @param emitter The object that emits the PROGRESS_EVENT
 * @param context the export operation context
 * @param collectionName the name of the collection to be exported
 * @param targetFileName the file to export to
 * @param index the collection index
 * @param total the total of all the steps to be performed to end the export
 * @param cb
 */
module.exports = function mongoExportWrapper(emitter, context, collectionName, targetFileName, index, total, cb) {
  var logger = context.logger;
  emitter.emit(PROGRESS_EVENT, STATUSES.INPROGRESS, index, total);

  var uriObject = mongoDbUri.parse(context.uri);

  logger.info('Exporting collection', {name: collectionName, index: index, total: total});

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

    mongodump.stdout.pipe(gzip);
    gzip.pipe(outStream);

    mongodump.on('close', function() {
      logger.info('Collection exported', {collectionName: collectionName});
      gzip.flush();
      context.archive.gzipFiles.push(targetFileName);
      return cb(null);
    }).on('error', function(err) {
      logger.error('Error exporting collection', {collectionName: collectionName, err: err});
      return cb(err);
    });
  });
};
