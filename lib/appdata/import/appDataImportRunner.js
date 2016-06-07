const async = require('async');
const prepareForImport = require('./preparationSteps').prepareForImport;
const mongoImport = require('./appDataImport').mongoImport;
const EventEmitter = require('events').EventEmitter;
const util = require('util');

const PROGRESS_EVENT = require('../../jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('../../jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('../../jobs/progressPublisher').FAIL_EVENT;
const HEARTBEAT_EVENT = 'heartbeat';

const STATUSES = require('../../models/AppdataJobSchema').statuses;

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
 *   }
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
  var dbConf = context.input.appData.dbConf;

  mongoImport(dbConf.host, dbConf.port, dbConf.name, file, function(err) {
    if (!err) {
      context.emitter.emit(PROGRESS_EVENT, STATUSES.INPROGRESS, ++(context.input.progress.current), context.input.progress.total);
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

  logger.info('Application data import started');

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
      self.emit(FAIL_EVENT, err, self.context.input.appData);
    } else {
      logger.info('Import finished');
      self.emit(FINISH_EVENT, self.context.input.appData, 'Import finished');
    }
  });
};

AppDataImportRunner.prototype.heartbeat = function() {
  var self = this;
  return setInterval(function() {
    self.emit(HEARTBEAT_EVENT);
  }, self.keepalive);
};

module.exports.AppDataImportRunner = AppDataImportRunner;
module.exports.HEARTBEAT_EVENT = HEARTBEAT_EVENT;