const path = require('path');
const async = require('async');
const fs = require('fs');
const zlib = require('zlib');
const models = require('fh-mbaas-middleware').models;

const extractTarFile = require('../shared/common').extractTarFile;

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
      return cb(err, context);
    }

    var basename = path.basename(context.input.path);

    var index = items.indexOf(basename);
    items.splice(index, 1);
    context.output.files = items;
    cb(null, context);
  });
}

function gunzip(folder, file, cb) {
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
      cb(err, resultingFile);
    });
  } else {
    return cb('Extraneous file found in import directory', context);
  }
}

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