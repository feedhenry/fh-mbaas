var EventEmitter = require('events').EventEmitter;
var util = require('util');

var AppdataJobSchema = require('../models/AppdataJobSchema');
var constants = AppdataJobSchema.statuses;
var async = require('async');

var preparation=require('./preparationSteps');
var appDataExport=require('./appDataExport');

var CONSTANTS = require('./constants');
const START_EVENT = require('../jobs/progressPublisher').START_EVENT;
const PROGRESS_EVENT = require('../jobs/progressPublisher').PROGRESS_EVENT;
const STATUS_EVENT = require('../jobs/progressPublisher').STATUS_EVENT;
const FINISH_EVENT = require('../jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('../jobs/progressPublisher').FAIL_EVENT;
const HEARTBEAT_EVENT = CONSTANTS.HEARTBEAT_EVENT;

var commonJobFunctions = require('./commonJobFunctions');

/**
 * This object represent the runner that will be in charge of exporting the application collection from the mongo
 * database to the destination archive.
 *
 * The produced archive will be a tar file containing one bson.gz file for each collection.
 *
 * @param context the context of the export
 * @param keepalive the keepalive timeout
 * @constructor
 */
function AppDataExportRunner(context, keepalive) {
  EventEmitter.call(this);
  var self = this;
  self.keepalive = keepalive || 30000;

  context.emitter = self;
  self.context = context;
}

util.inherits(AppDataExportRunner, EventEmitter);

AppDataExportRunner.prototype.run = function() {

  var logger = this.context.logger;
  logger.info('Application export started');

  if (!this.context.appInfo) {
    logger.warn('Application not found. Aborting');

    this.emit(FAIL_EVENT, 'Export failed. Application not found');
    return;
  }

  if (this.status === constants.FINISHED || this.status === constants.FAILED) {
    logger.info('[APPDATAEXPORT] Application export finished');
    this.emit(STATUS_EVENT, this.appInfo, this.status);
    return;
  }
  if (this.status === constants.INPROGRESS) {
    logger.info('[APPDATAEXPORT] Export already in progress, aborting');

    this.emit(FAIL_EVENT, 'Export failed due to export already in progress');
    return;
  }

  startExport.bind(this)();
};


/**
 * Starts the application data export process.
 * The method pass a 'context' object to the function composing the export flow. Such context will be shared among all
 * the functions, and each function will be able to enrich it with new informations.
 */
function startExport() {
  var self = this;
  self.interval = this.heartbeat();
  var context = self.context;

  var logger = context.logger;

  self.emit(START_EVENT, context.appInfo, 'Export started');
  async.waterfall([
    async.apply(preparation.prepare, context),
    // Real export
    appDataExport.exportData.bind(self),
    commonJobFunctions.registerStorage,
    commonJobFunctions.updateModelWithStorageData
  ], function(err) {
    if (self.interval) {
      clearInterval(self.interval);
    }
    if (err) {
      logger.error('Export failed', {err: err});
      self.emit(FAIL_EVENT, err, context.appInfo);
    } else {
      logger.info('Export finished');
      self.emit(FINISH_EVENT, context.appInfo, 'Export finished');

      // Make sure to update the `progress` field on success.
      self.emit(PROGRESS_EVENT, constants.FINISHED, context.progress.total, context.progress.total);
    }

    commonJobFunctions.cleanUp(context, function(cleanUpError) {
      if (cleanUpError) {
        logger.error('Error cleaning up after exporting', {err: cleanUpError});
      } else {
        logger.info('Cleanup executed');
      }
    });
  });
}

AppDataExportRunner.prototype.heartbeat = function() {
  var self = this;
  return setInterval(function() {
    self.context.jobModel.markModified('modified');
    self.context.jobModel.save(function(err) {
      if (err) {
        self.context.logger.error('Failed to save job', {err: err});
      }
    });
    self.emit(HEARTBEAT_EVENT);
  }, self.keepalive);
};

module.exports.AppExportRunner = AppDataExportRunner;
