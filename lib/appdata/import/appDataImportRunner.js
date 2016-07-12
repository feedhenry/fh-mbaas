const async = require('async');
const prepareForImport = require('./preparationSteps').prepareForImport;
const mongoImport = require('./appDataImport').mongoImport;
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const path = require('path');

const START_EVENT = require('../../jobs/progressPublisher').START_EVENT;
const FINISH_EVENT = require('../../jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('../../jobs/progressPublisher').FAIL_EVENT;
const HEARTBEAT_EVENT = 'heartbeat';

/**
 * Creates an AppDataImportRunner instance
 * @param context the context of the import. This will contain:
 * Context is as follows:
 * { logger: logger,
 *   input: {
 *     appData: {
 *        guid: appguid    // REQUIRED TO START THE IMPORT
 *        env: environment // REQUIRED TO START THE IMPORT
 *     },
 *     path: filePath      // REQUIRED TO START THE IMPORT
 *     folder: fileFolder  // COMPUTED AUTOMATICALLY
 *   },
 *   output: {
 *    folder: outputFolder // COMPUTED AUTOMATICALLY
 *    files: []            // COMPUTED AUTOMATICALLY
 *   },
 *   importJob: jobModel   //RQUIRED TO START THE IMPORT the appdata job model
 * }
 * @constructor
 */
function AppDataImportRunner(context, keepalive) {
  this.keepalive = keepalive ? keepalive : 30000;
  EventEmitter.call(this);
  context.emitter = this;
  this.context = context;
}

function performImport(context, file, cb) {
  var dbConf = context.appInfo.dbConf;
  var logger = context.logger;

  var importFile = path.join(context.input.folder, file);

  logger.info('Importing file', {path: importFile, db: { host: dbConf.host, port:dbConf.port, name: dbConf.name} });

  mongoImport(dbConf.host, dbConf.port, dbConf.name, importFile, function(err) {
    if (!err) {
      context.progress.next();
    }
    cb(err, context);
  });
}

function importFiles(context, cb) {
  async.eachSeries(
    context.output.files,
    async.apply(performImport, context), function(err) {
      cb(err, context);
    });
}

util.inherits(AppDataImportRunner, EventEmitter);

AppDataImportRunner.prototype.run = function() {
  var self = this;
  var logger = this.context.logger;
  self.interval = this.heartbeat();

  var hostName = require('os').hostname();

  var jobModel = this.context.jobModel;

  if (jobModel.metadata.shipHostname !== hostName) {
    // File is not mine. Nothing to do.
    logger.info('File was uploaded on another host. Ignoring.', {thisHost: hostName, fileHost: jobModel.metadata.shipHostname});
    return;
  }

  logger.info('Application data import started');


  self.emit(START_EVENT, self.context.appInfo, 'Import started');
  async.waterfall([
    async.apply(prepareForImport, self.context),
    importFiles
  ], function(err) {

    // Stop heartbeat
    if (self.interval) {
      clearInterval(self.interval);
    }

    if (err) {
      logger.error('Import failed', {err: err});
      self.emit(FAIL_EVENT, err, self.context.appInfo);
    } else {
      logger.info('Import finished');
      self.emit(FINISH_EVENT, self.context.appInfo, 'Import finished');
    }
  });
};

AppDataImportRunner.prototype.heartbeat = function() {
  var self = this;
  return setInterval(function() {
    var importJob = self.context.jobModel;
    importJob.markModified('modified');
    importJob.save(function(err) {
      if (err) {
        self.context.logger.error('Failed to save job', {err: err});
      }
    });
    self.emit(HEARTBEAT_EVENT);
  }, self.keepalive);
};

module.exports.AppDataImportRunner = AppDataImportRunner;
module.exports.HEARTBEAT_EVENT = HEARTBEAT_EVENT;