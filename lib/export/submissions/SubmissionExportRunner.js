var EventEmitter = require('events').EventEmitter;
var util = require('util');

var SubmissionExportJobSchema = require('../../models/SubmissionDataJobSchema');
var constants = SubmissionExportJobSchema.statuses;
var async = require('async');

var preparation=require('./preparationSteps');
var submissionDataExport=require('./submissionDataExport');
var commonJobFunctions = require('../commonJobFunctions');

var progressPublisher = require('../../../lib/jobs/progressPublisher');
const PROGRESS_EVENT = progressPublisher.PROGRESS_EVENT;
const STATUS_EVENT = progressPublisher.STATUS_EVENT;
const FINISH_EVENT = progressPublisher.FINISH_EVENT;
const FAIL_EVENT = progressPublisher.FAIL_EVENT;
const HEARTBEAT_EVENT = 'heartbeat';


/**
 * This object represent the runner that will be in charge of exporting the collections containing submissions
 *
 * The produced archive will be a tar file containing one bson.gz file for each collection.
 *
 * @param context
 * @param context.jobID the agenda job ID
 * @param context.exportJob the mongo object that will contain the progress of the export
 * @param context.outputDir the destination directory. Here is where the export tree will be produced.
 * @param keepalive the keepalive timeout
 * @constructor
 */
function SubmissionExportRunner(context, keepalive) {
  EventEmitter.call(this);
  this.keepalive = keepalive ? keepalive : 30000;

  context.emitter = this;
  this.context = context;
}

util.inherits(SubmissionExportRunner, EventEmitter);

SubmissionExportRunner.prototype.run = function() {

  var logger = this.context.logger;
  logger.info('Submission export started');

  if (this.status === constants.FINISHED || this.status === constants.FAILED) {
    logger.info('[SUBMISSIONEXPORT] Submission export finished');
    this.emit(STATUS_EVENT, this.status);
    return;
  }
  if (this.status === constants.INPROGRESS) {
    logger.info('[SUBMISSIONEXPORT] Export already in progress, aborting');

    this.emit(FAIL_EVENT, 'Export failed due to export already in progress');
    return;
  }

  startExport.bind(this)();
};



/**
 * Starts the submission data export process.
 * The method pass a 'context' object to the function composing the export flow. Such context will be shared among all
 * the functions, and each function will be able to enrich it with new informations.
 */
function startExport() {
  var self = this;
  self.interval = this.heartbeat();
  var context = self.context;

  var logger = context.logger;

  async.waterfall([
    //Preparing for the submission export
    async.apply(preparation.prepare, context),
    // Export all submission collections
    submissionDataExport.exportData.bind(self),
    commonJobFunctions.registerStorage,
    commonJobFunctions.updateModelWithStorageData
  ], function(err) {
    if (self.interval) {
      clearInterval(self.interval);
    }
    if (err) {
      logger.error('Export failed', {err: err});
      self.emit(FAIL_EVENT, err);
    } else {
      logger.info('Export finished');
      self.emit(FINISH_EVENT, 'Export finished');

      // Make sure to update the `progress` field on success. Number of exported
      // collections equals number of total collections now
      self.emit(PROGRESS_EVENT, constants.FINISHED, context.collections.length, context.collections.length);
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

SubmissionExportRunner.prototype.heartbeat = function() {
  var self = this;
  return setInterval(function() {
    self.emit(HEARTBEAT_EVENT);
  }, self.keepalive);
};

module.exports.SubmissionExportRunner = SubmissionExportRunner;
module.exports.HEARTBEAT_EVENT = HEARTBEAT_EVENT;
