var models = require('fh-mbaas-middleware').models;
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();

var AppDataExportRunner = require('../export/AppDataExportRunner').AppExportRunner;
var ProgressPersistor = require('./progressPersistor').ProgressPersistor;
var AppDataImportRunner = require('../appdata/import/appDataImportRunner').AppDataImportRunner;

const JOB_TYPES = require('../models/AppdataJobSchema').types;
const OUTPUT_DIR = fhconfig.value('fhmbaas.appdataexport.output_dir');
const EXPORT_LOG_TAG = '[APPDATAEXPORT]';

function exportContext(appInfo, jobModel, outputDir) {
  var TaggedLogger = require('./taggedLogger').TaggedLogger;
  return {
    appInfo: appInfo,
    exportJob: jobModel,
    jobID: jobModel._id.toString(),
    outputDir: outputDir,
    logger : new TaggedLogger(logger.child({appInfo: {appGuid: appInfo.guid, name: appInfo.name} }), EXPORT_LOG_TAG)
  };
}

function importContext(appInfo, jobModel) {
  var TaggedLogger = require('./taggedLogger').TaggedLogger;
  return {
    input: {
      appData: appInfo,
      path: jobModel.metadata.filePath
    },
    output: {},
    importJob: jobModel,
    jobID: jobModel._id.toString(),
    logger : new TaggedLogger(logger.child({appInfo: {appGuid: appInfo.guid, name: appInfo.name} }), EXPORT_LOG_TAG)
  };
}

function handleError(job, error) {
  logger.error('[APPDATAEXPORT] Error occured when running job', {error: error, job: job.toJSON()});
  job.fail(error.message || error, function(err) {
    if (err) {
      logger.error('[APPDATAEXPORT] Error when fail job', {err: err});
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