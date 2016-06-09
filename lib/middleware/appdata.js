var AppdataJob = require('../models').AppdataJob;
var jobTypes = require('../models/BaseImportExportJobSchema').types;
var appExportController = require('../export/appDataExportController');
var builder = require('./buildJobMiddleware');

function buildFilter(req, res, next) {
  if (!req.params.appid && !req.params.environment) {
    return next(builder.createErrorObject(400, "Missing required arguments: envId, appId"));
  } else if (!req.params.appid) {
    return next(builder.createErrorObject(400, "Missing required argument appId"));
  } else if (!req.params.environment) {
    return next(builder.createErrorObject(400, "Missing required argument envId"));
  }
  return {
    jobType: jobTypes.EXPORT,
    appid: req.params.appid,
    environment:req.params.environment
  };
}

var middleware = builder(
  AppdataJob,
  appExportController.startExport.bind(appExportController),
  buildFilter);

middleware.fillStopApp = function(req, res, next) {
  req.params.stopApp = req.body.stopApp;
  next();
};

module.exports = middleware;