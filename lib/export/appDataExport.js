var mongoDbUri = require('mongodb-uri');
const zlib = require('zlib');
var async = require('async');
var child_process = require('child_process');
var path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const PROGRESS_EVENT = require('../jobs/progressPublisher').PROGRESS_EVENT;
const STATUSES = require('../models/AppdataJobSchema').statuses;
const MONGO_DEFAULT_PORT = 27017;

/**
 * Return the host name of the secondary replica set (if possible). It is ok
 * to use `child_process#exec` here because the expected output is either an
 * error message or very small.
 *
 * The command that is run on mongo is using the `rs#status` method to get
 * replica set data. It will first check if the `members` property is present.
 * If not then this setup does not have replica sets.
 */
function getSecondaryReplSetHost(cb) {
  var command = [
    'mongo --quiet --eval',
    ' "this.rs.status().members && this.rs.status().members.filter(function (x) { return x.state === 2 })[0].name"'
  ].join('');

  exec(command, function (err, stdout, stderr) {
    if (err) {
      return cb(err);
    }

    // If the mongo db does not have replica sets, an error will
    // be written to stderr
    if (stderr || !stdout) {
      return cb(null, null);
    }

    var result = {
      port: MONGO_DEFAULT_PORT
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

/**
 * Strip off the ditch prefix as it does not contain any information that is needed
 * to import the app.
 *
 * The ditch prefix consinst of
 * (0) fh
 * (1) <DOMAIN>-<APP_ID>-<ENV_ID>
 * (2) collection name
 *
 * and the separator is underscore. We only want (2). However the collecion name can also contain
 * underscore, so whe can't just split and take the last item.
 *
 * @param collectionName Original collection name
 */
function formatCollectionName(collectionName) {
  if (collectionName && collectionName.indexOf("_") >= 0) {
    var parts = collectionName.split("_");

    // At least two prefix items and one collection name
    // There can be more items if the collection name contains underscores
    if (parts.length >= 3) {
      return parts.splice(2).join("_");
    }

    return collectionName;
  } else {
    return collectionName;
  }
}

/**
 * This function spawns the mongodump command to export each single collection composing the application data.
 * @param emitter The object that emits the PROGRESS_EVENT
 * @param context the export operation context
 * @param collectionName the name of the collection to be exported
 * @param index the collection index
 * @param total the total of all the steps to be performed to end the export
 * @param cb
 */
function mongoExportWrapper(emitter, context, collectionName, index, total, cb) {
  var logger = context.logger;
  emitter.emit(PROGRESS_EVENT, STATUSES.INPROGRESS, index, total);

  var uriObject = mongoDbUri.parse(context.uri);

  logger.info('Exporting collection', {name: collectionName, index: index, total: total});

  getSecondaryReplSetHost(function (err, result) {
    if (err) {
      logger.error('Error querying replica sets', {err: err});
      return cb(err);
    }

    // If we are in a setup with replica sets the host variable will be set to
    // the host of the secondary instance. We prefer to run mongodump there. If
    // it is not set we just use the host from the URL.
    var dumpHost = (result && result.host) || uriObject.hosts[0].host;
    var dumpPort = (result && result.port) || uriObject.hosts[0].port || MONGO_DEFAULT_PORT;

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

    var targetFileName = formatCollectionName(collectionName) + '.bson.gz';
    var targetFilePath = path.join(context.path, targetFileName);
    var outStream = fs.createWriteStream(targetFilePath);

    var gzip = zlib.createGzip();

    mongodump.stdout.pipe(gzip);
    gzip.pipe(outStream);

    mongodump.on('close', function (code) {
      logger.info('Collection exported', {collectionName: collectionName});
      gzip.flush();
      context.archive.gzipFiles.push(targetFileName);
      return cb(null);
    }).on('error', function (err) {
      logger.error('Error exporting collection', {collectionName: collectionName, err: err});
      return cb(err);
    });
  });
}

/**
 * This function spawns the 'tar' command to put all the produced bson.gz files inside one single tar file.
 *
 * @param cwd the 'current working directory'. It must be the directory containing the bson.gz files.
 * @param outputFileName the file to be produced.
 * @param collectionFiles The lis of files to be put inside the tar file.
 * @param cb
 */
function tar(context, outputFileName, cb) {
  var logger = context.logger;

  var cwd = context.path;
  var collectionFiles = context.archive.gzipFiles;

  var tarParams = ['cf', outputFileName].concat(collectionFiles);

  var tarProcess = child_process.spawn('tar', tarParams, {cwd: cwd});

  tarProcess.on('close', function (code) {
    if (code === 0) {
      logger.info('TAR file created', {cwd: cwd, filename: outputFileName});
      return cb(null);
    } else {
      logger.info('Error preparing TAR file', {cwd: cwd, filename: outputFileName, code: code});
      return cb('Error preparing TAR file. Code: ' + code);
    }
  }).on('error', function (err) {
    logger.error('Error preparing TAR file', {cwd: cwd, filename: outputFileName, err: err});
    return cb(err);
  });
}

/**
 * Takes from the context the list of created GZ files containing the app collections and put them inside the
 * destination tar file.
 * @param context the context
 * @param cb
 */
function createExportArchive(context, cb) {
  var logger = context.logger;

  logger.info('Creating export archive', {outDir: context.path, fileName: 'export.tar'});
  async.series([
    async.apply(tar, context, 'export.tar'),
    async.apply(fs.stat, path.join(context.path, 'export.tar'))
  ], function (err, stats) {
    if (!err) {
      context.archive = {
        path: path.join(context.path, 'export.tar'),
        size: stats[1].size
      };

      // updating job data
      var exportJob = context.exportJob;
      exportJob.updateMetadata("filePath", context.archive.path);
      exportJob.updateMetadata("fileSize", context.archive.size);
      exportJob.save(function (err) {
        if (err) {
          logger.error('Error updating file and size in mongo', {err: err});
        }
        return cb(err, context);
      });
    } else {
      logger.error('Error creating TAR archive', err);
      return cb(err, context);
    }
  });
}

/**
 * This function triggers the export.
 *
 * @param context the applicaton data export context
 * @param cb
 */
function performExport(context, cb) {
  var self = this;
  var logger = context.logger;
  var index = 0;
  var total = context.collections.length;

  context.archive = {
    gzipFiles: []
  };

  async.eachSeries(context.collections, function (collectionName, cb) {
    self.emit(PROGRESS_EVENT, STATUSES.INPROGRESS, ++index, total);
    mongoExportWrapper(self, context, collectionName, index, total, cb);
  }, function (err) {
    if (!err) {
      createExportArchive(context, cb);
    } else {
      logger.error('Error exporting from mongo', err);
      return cb(err, context);
    }
  });
}

module.exports.exportData = performExport;
module.exports.formatCollectionName = formatCollectionName;
module.exports.getSecondaryReplSetHost = getSecondaryReplSetHost;