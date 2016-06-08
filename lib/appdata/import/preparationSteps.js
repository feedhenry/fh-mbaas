const path = require('path');
const async = require('async');
const fs = require('fs');
const models = require('fh-mbaas-middleware').models;

const extractTarFile = require('../shared/common').extractTarFile;
const gunzip = require('../shared/common').gunzip;
const PROGRESS_EVENT = require('../../jobs/progressPublisher').PROGRESS_EVENT;
const STATUSES = require('../../models/AppdataJobSchema').statuses;

/**
 * Checks if the app has been migrated.
 *
 * @param context
 * @param cb
 */
function checkAppIsMigrated(context, cb) {
  var AppMbaasModel = models.getModels().AppMbaas;
  var appGuid = context.input.appData.guid;
  var env = context.input.appData.env;

  AppMbaasModel.findOne({guid: appGuid, environment: env}, function(err, app) {
    if (err) {
      return cb(err, context);
    }

    if (!app) {
      return cb('No app with guid "' + appGuid + '" could be found');
    }

    if (!app.dbConf) {
      // The app has not been upgraded yet
      return cb(new Error('The app has not been migrated yet. Import aborted'), context);
    }

    context.input.appData = app;
    cb(null, context);
  });
}

/**
 * Gets the list of extracted files from the disk
 * @param context
 * @param cb
 */
function getListOfFiles(context, cb) {
  context.output = {};
  fs.readdir(context.input.folder, function(err, items) {
    if (err) {
      return cb(new Error(err), context);
    }

    var basename = path.basename(context.input.path);

    // Remove the tar file name from the list of files contained in the directory
    var index = items.indexOf(basename);
    if (index < 0) {
      var error = new Error('The content of the directory has been changed (cannot find "' + context.input.path + '" anymore)');
      error.code = 500;
      return cb(error);
    }
    items.splice(index, 1);

    context.output.files = items;

    /* To show the progress bar we need to know the total number of steps we need to executes.
       All the steps, but the gunzip and import are fixed.
       On the other side, gunzip and import, depends on the number of files to be gunzipped and imported.
       Since now we know how many files we are going to process, we can finally set the 'total' number of steps.
     */

    // Now we knows how many files we are going to import, so we can start sending progress events
    context.import = {
      progress : {
        /* The files will be processed two times:
           * First time they will be gunzipped
           * Second time they will be imported

           That means that the number of steps to be executed is obtained by dubling the number of files
         */
        total: context.output.files.length * 2,
        current : 0
      }
    };


    cb(null, context);
  });
}

function extractAndDelete(context, file, cb) {

  var resultingFile;

  if (/\.gz$/.test(file)) {
    async.series([
      function(callback) {
        gunzip(context.output.folder, file, function(err, outFile) {
          if (err) {
            return callback(err);
          }
          resultingFile = outFile;
          callback(null);
        });
      },
      async.apply(fs.unlink, path.join(context.output.folder, file))
    ], function(err) {
      if (!err) {
        context.emitter.emit(PROGRESS_EVENT, STATUSES.INPROGRESS, ++context.import.progress.current, context.import.progress.total);
        return cb(null, resultingFile);
      }
      return cb(new Error(err));
    });
  } else {
    return cb(new Error('Extraneous file found in import directory'), context);
  }
}

/**
 * Output:
 * context.output.files : list of ungzipped files
 * @param context
 * @param cb
 */
function uncompressGZipFiles(context, cb) {
  context.output.folder = context.input.folder;

  async.mapLimit(context.output.files,
    2,
    function(file, cb) {
      extractAndDelete(context, file, cb);
    },
    function(err, resultingFiles) {
      context.output.files = resultingFiles;
      cb(err, context);
    });
}

/**
 * Performs all the preparation steps needed to be able to import the file
 * @param context import process context
 * @param cb the callback
 */
function prepareForImport(context, cb) {
  async.waterfall([
    async.apply(checkAppIsMigrated, context),
    extractTarFile,
    getListOfFiles,
    uncompressGZipFiles
  ], function(err) {
    cb(err);
  });
}

module.exports.prepareForImport=prepareForImport;