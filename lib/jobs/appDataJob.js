var models = require('fh-mbaas-middleware').models;
var fhconfig = require('fh-config');
var logger = require('../util/logger').getLogger();

var AppDataExportRunner = require('../export/AppDataExportRunner').AppExportRunner;
var ProgressPersistor = require('./progressPersistor').ProgressPersistor;
var AppDataImportRunner = require('../appdata/import/appDataImportRunner').AppDataImportRunner;

const contextBuilder = require('./context').contextBuilder;

const JOB_TYPES = require('../models/AppdataJobSchema').types;
const OUTPUT_DIR = fhconfig.value('fhmbaas.appdataexport.output_dir');
const EXPORT_LOG_TAG = '[APPDATAEXPORT]';
const IMPORT_LOG_TAG = '[APPDATAIMPORT]';

function exportContext(appInfo, jobModel, outputDir) {
  var TaggedLogger = require('./taggedLogger').TaggedLogger;

  return contextBuilder()
    .withApplicationInfo(appInfo)
    .withJobModel(jobModel)
    .withLogger(new TaggedLogger(logger.child({appInfo: {appGuid: appInfo.guid, name: appInfo.name} }), EXPORT_LOG_TAG))
    .withCustomAtt('outputDir', outputDir)
    .build();
}

function importContext(appInfo, jobModel) {
  var TaggedLogger = require('./taggedLogger').TaggedLogger;

  return contextBuilder()
    .withApplicationInfo(appInfo)
    .withJobModel(jobModel)
    .withLogger(new TaggedLogger(logger.child({appInfo: {appGuid: appInfo.guid, name: appInfo.name} }), IMPORT_LOG_TAG))
    .withCustomAtt('output', {})
    .withCustomAtt('input', { path: jobModel.metadata.filePath})
    .build();
}

function handleError(job, error) {
  logger.error('[APPDATAJOB] Error occured when running job', {error: error, job: job.toJSON()});
  job.fail(error.message || error, function(err) {
    if (err) {
      logger.error('[APPDATAJOB] Error when fail job', {err: err});
    }
  });
}

function start(appDataJobModel, heartbeat) {
  logger.info('[APPDATAJOB] Start running job', {job: appDataJobModel.toJSON()});
  var appGuid = appDataJobModel.appid;
  var env = appDataJobModel.environment;
  var AppMbaasModel = models.getModels().AppMbaas;

  AppMbaasModel.findOne({guid: appGuid, environment: env}, function(err, appData) {
    if (err) {
      return handleError(appDataJobModel, err);
    }

    if (!appData) {
      return handleError(appDataJobModel, new Error('No application found with guid[' + appGuid + '] and environment [' + env + ']'));
    }

    var runner = null;
    var context;
    switch (appDataJobModel.jobType) {
    case JOB_TYPES.EXPORT:
      context = exportContext(appData, appDataJobModel, OUTPUT_DIR);
      runner = new AppDataExportRunner(context, heartbeat);
      break;
    case JOB_TYPES.IMPORT:
      context = importContext(appData, appDataJobModel);
      runner = new AppDataImportRunner(context, heartbeat);
      break;
    default:
      logger.error('[APPDATAJOB] Unsupported jobType: ' + appDataJobModel.jobType);
      break;
    }

    if (runner) {
      // Persist the progress of the runner
      new ProgressPersistor(context.logger).listen(runner, appDataJobModel, function(err) {
        if (err) {
          logger.error('[APPDATAJOB] Error persisting progress', err);
        }
      });
      runner.run();
    }
  });
}

module.exports = {
  start: start
};