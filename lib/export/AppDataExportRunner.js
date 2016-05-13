var fhConfig = require('fh-config');

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');
const fs = require('fs');
const common = require('../util/common');
var mkdirp = require('mkdirp');
var mongoDbUri = require('mongodb-uri');
var path = require('path');
var exec = require('child_process').exec;

var ExportJobSchema = require('../models/ExportJobSchema');
var ExportJob = require('../models').ExportJob;
var constants = ExportJobSchema.statuses;

var diskspace = require('diskspace');

var async = require('async');

var preparation=require('./preparationSteps');
var appDataExport=require('./appDataExport');

const STATUS_EVENT = require('../jobs/progressPublisher').STATUS_EVENT;
const FINISH_EVENT = require('../jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('../jobs/progressPublisher').FAIL_EVENT;
const HEARTBEAT_EVENT = 'heartbeat';

var storage=require('../storage/index');

/**
 * This object represent the runner that will be in charge of exporting the application collection from the mongo
 * database to the destination archive.
 *
 * The produced archive will be a tar file containing one bson.gz file for each collection.
 *
 * @param jobID the agenda job ID
 * @param appInfo the details of the application to be exported
 * @param exportJob the mongo object that will contain the progress of the export
 * @param outputDir the destination directory. Here is where the export tree will be produced.
 * @param keepalive the keepalive timeout
 * @constructor
 */
function AppDataExportRunner(context, keepalive){
  EventEmitter.call(this);
  this.keepalive = keepalive ? keepalive : 30000;

  this.context = context;
}

util.inherits(AppDataExportRunner, EventEmitter);

AppDataExportRunner.prototype.run = function(){

  var logger = this.context.logger;
  logger.info('Application export started');

  if (!this.context.appInfo) {
    logger.warn('Application not found. Aborting');

    this.emit(FAIL_EVENT, 'Export failed. Application not found');
    return;
  }

  if(this.status === constants.FINISHED || this.status === constants.FAILED){
    logger.info('[APPDATAEXPORT] Application export finished');
    this.emit(STATUS_EVENT, this.appInfo, this.status);
    return;
  }
  if(this.status === constants.INPROGRESS){
    logger.info('[APPDATAEXPORT] Export already in progress, aborting');

    this.emit(FAIL_EVENT, 'Export failed due to error: ' + err);
    return;
  }

  startExport.bind(this)();
};

function registerStorage(context, cb) {
  var logger = context.logger;
  logger.info('Registering file into the storage', {path: context.archive.path});
  storage.registerFile(context.archive.path, function(err, fileModel) {
    if (err) {
      logger.error('Failed registering into the storage', {path: context.archive.path, err: err});
      return cb(err);
    }

    context.archive.fileId = fileModel.id;

    return cb(null, context);
  });
}

function updateModelWithStorageData(context, cb) {
  var logger = context.logger;
  logger.info('Storing storage pointer inside the job model', {fileId: context.archive.fileId});
  var exportJob = context.exportJob;
  exportJob.set('fileId', context.archive.fileId);
  exportJob.save(function (err) {
    if (err) {
      logger.error('Failed storing storage pointer inside the job model', {path: context.archive.fileId, err: err});
    }
    return cb(err);
  });
}

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

  async.waterfall([
    async.apply(preparation.prepare, context),
    // Real export
    appDataExport.exportData.bind(self),
    registerStorage,
    updateModelWithStorageData
  ], function (err) {
    if (self.interval) {
      clearInterval(self.interval);
    }
    if(err) {
      logger.error('Export failed', {err: err});
      self.emit(FAIL_EVENT, err, context.appInfo);
    } else {
      logger.info('Export finished');
      self.emit(FINISH_EVENT, context.appInfo, 'Export finished');
    }

    cleanUp(context, function(cleanUpError) {
      if (cleanUpError) {
        logger.error('Error cleaning up after exporting', {err: cleanUpError});
      } else {
        logger.info('Cleanup executed');
      }
    });
  });
}

/**
 * Remove all the temporary files.
 *
 * @param context the context of the current export process.
 * @param cb
 * @returns {*}
 */
function removeTempFiles(context, cb) {
  if (!context.path) {
    // Nothing to clean
    return cb();
  }

  var command = 'rm -f ' + path.join(context.path, '*.gz');
  exec(command, cb);
}

function cleanUp(context, cb) {
  var logger = context.logger;
  logger.info('Cleaning up');
  if (context.db) {
    async.parallel(
      [
        context.db.close.bind(context.db),
        async.apply(removeTempFiles, context)
      ], function (err) {
        if (err) {
          logger.error('Error cleaning up', {err: err});
        }
        return cb(err);
      }
    );
  } else {
    // If the DB is not connected there is nothing to clean up
    return cb();
  }
}

AppDataExportRunner.prototype.heartbeat = function() {
  var self = this;
  return setInterval(function() {
    self.emit(HEARTBEAT_EVENT);
  }, self.keepalive);
};

module.exports.AppExportRunner = AppDataExportRunner;
module.exports.HEARTBEAT_EVENT = HEARTBEAT_EVENT;
