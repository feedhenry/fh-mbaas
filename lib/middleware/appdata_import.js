var AppdataJob = require('../models').AppdataJob;
var jobTypes = require('../models/BaseImportExportJobSchema').types;
var importController = require('../import/appDataImportController');
var builder = require('./buildJobMiddleware');
var fhconfig = require('fh-config');
var storage = require('../storage');
var path = require('path');
var models = require('fh-mbaas-middleware').models;

// The location for all uploaded files
const UPLOAD_PATH = fhconfig.value('fhmbaas.appdata_jobs.upload_dir');

/**
 * This middleware injects the filter criteria into the request that is used
 * to filter for appdata import jobs.
 *
 * @param req Http request
 * @param res Http response
 * @param next Invoke next middleware
 */
function buildFilter(req, res, next) {
  if (!req.params.appid && !req.params.environment) {
    return next(builder.createErrorObject(400, "Missing required arguments: envId, appId"));
  } else if (!req.params.appid) {
    return next(builder.createErrorObject(400, "Missing required argument appId"));
  } else if (!req.params.environment) {
    return next(builder.createErrorObject(400, "Missing required argument envId"));
  }
  return {
    jobType: jobTypes.IMPORT,
    appid: req.params.appid,
    environment:req.params.environment
  };
}

/**
 * Since export and import tasks don't differ a lot between appdata and submissions we
 * can use a builder to create a standard middleware.  We only specify:
 *
 * 1) model:    which job model to use (AppdataJob, SubmissionsJob)
 * 2) spawnFn:  which function will be invoked to create the job
 * 3) filterFn: which functino will be used to filter the jobs (for
 *    endpoints like list, read)
 *
 * The created middleware object will contain all function required for list, read, create
 * and generateUrl (though this one is not required for appdata import).
 */
var middleware = builder(
  AppdataJob,
  importController.startImportJob.bind(importController),
  buildFilter);

/**
 * Append properties from body to params. Filename and filesize will be sent
 * in the request body. But in later stages we don't want to distinguish between two
 * different locations for parameters. So we append all of them to the params array.
 *
 * @param req Http request
 * @param res Http response
 * @param next Invoke next middleware
 */
middleware.fillBody = function(req, res, next) {
  req.params.filename = req.body.filename;
  req.params.filesize = req.body.filesize;
  next();
};

/**
 * Before the upload starts we already have to register a file in the storage. This is
 * required to generate the URL that will be used for the upload. The initial request also
 * contains the future filename and filesize.
 *
 * @param req Http request
 * @param res Http response
 * @param next Invoke next middleware
 */
middleware.registerUpload = function(req, res, next) {
  // filename and filesize are required. 0 is regarded as invalid filesize.
  if (!req.params.filename || !req.params.filesize) {
    return next(new Error("File name or size missing or invalid"));
  }

  // Create the absolute path to the file in the storage (where it will be after upload)
  var filePath = path.join(UPLOAD_PATH, req.params.filename);
  storage.registerFileForUpload(filePath, req.params.filesize, function(err, fileEntry) {
    if (err) {
      return next(err);
    }

    req.params.fileId = fileEntry._id;
    next();
  });
};

/**
 * Make sure that the app is migrated before we accept an upload. Only migrated
 * apps are supported for import.
 * @param req Http request
 * @param res Http response
 * @param next Invoke next middleware
 */
middleware.ensureMigrated = function(req, res, next) {
  var AppMbaasModel = models.getModels().AppMbaas;
  var env = req.params.environment;
  var appGuid = req.params.appid;

  AppMbaasModel.findOne({guid: appGuid, environment: env}, function(err, app) {
    if (err) {
      return next(err);
    }

    if (!app) {
      return next(new Error('No app with guid "' + appGuid + '" could be found'));
    }

    if (!app.dbConf || !app.migrated) {
      // The app has not been upgraded yet
      return next(new Error('The app has not been migrated yet. Import aborted'));
    }

    next();
  });
};

module.exports = middleware;