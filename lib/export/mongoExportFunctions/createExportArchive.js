var async = require('async');
var child_process = require('child_process');
var path = require('path');
const fs = require('fs');

/**
 * This function spawns the 'tar' command to put all the produced bson.gz files inside one single tar file.
 *
 * @param context
 * @param context.path the 'current working directory'. It must be the directory containing the bson.gz files.
 * @param context.archive.collectionFiles The lis of files to be put inside the tar file.
 * @param outputFileName the file to be produced.
 * @param cb
 */
function tar(context, outputFileName, cb) {
  var logger = context.logger;

  var cwd = context.path;
  var collectionFiles = context.archive.gzipFiles;

  var tarParams = ['cf', outputFileName].concat(collectionFiles);

  var tarProcess = child_process.spawn('tar', tarParams, {cwd: cwd});

  tarProcess.on('close', function(code) {
    if (code === 0) {
      logger.info('TAR file created', {cwd: cwd, filename: outputFileName});
      return cb(null);
    } else {
      logger.info('Error preparing TAR file', {cwd: cwd, filename: outputFileName, code: code});
      return cb('Error preparing TAR file. Code: ' + code);
    }
  }).on('error', function(err) {
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
module.exports = function createExportArchive(context, cb) {
  var logger = context.logger;

  logger.info('Creating export archive', {outDir: context.path, fileName: 'export.tar'});
  async.series([
    async.apply(tar, context, 'export.tar'),
    async.apply(fs.stat, path.join(context.path, 'export.tar'))
  ], function(err, stats) {
    if (!err) {
      context.archive = {
        path: path.join(context.path, 'export.tar'),
        size: stats[1].size
      };

      // updating job data
      var exportJob = context.jobModel;
      exportJob.updateMetadata("filePath", context.archive.path);
      exportJob.updateMetadata("fileSize", context.archive.size);
      exportJob.save(function(err) {
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
};