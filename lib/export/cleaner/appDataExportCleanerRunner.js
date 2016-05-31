var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var async = require('async');
var fhConfig = require('fh-config');
var storage = require('../../storage/index');

const FINISH_EVENT = require('../../jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('../../jobs/progressPublisher').FAIL_EVENT;
const PROGRESS_EVENT = require('../../jobs/progressPublisher').PROGRESS_EVENT;

var ExportJob = require('../../models/index').AppdataJob;

var DEFAULT_GRACE_TIME = 10;

var GRACE_TIME = fhConfig.value('fhmbaas.appdataexport.cleaner.grace_time') || DEFAULT_GRACE_TIME;

/**
 * Updates the file deletion status into the database
 *
 * @param doc the document to be updated
 * @param cb
 */
function updateStatus(context, doc, cb) {
  doc.updateMetadata('fileDeleted', true);
  doc.save(function(err) {
    if (err) {
      context.logger.error('Error updating delete status', {err: err, path: doc.metadata.filePath, id: doc.id});
    }
    cb(err);
  });
}

/**
 * Deletes the file associated with the document from the filestore
 *
 * @param doc the document
 * @param cb
 * @returns {*}
 */
function deleteFileStore(doc, cb) {
  var self = this;

  if (!doc.metadata.fileId) {
    // No filestore to be deleted...
    self.context.logger.warn('FileID not set into the exportjob object');
    return cb();
  }

  self.emit(PROGRESS_EVENT, 'Deleting filestore ' + doc.metadata.fileId);

  storage.deleteFile(doc.metadata.fileId, function(err) {
    if (err) {
      self.context.logger.error('Error deleting filestore', {err: err, path: doc.metadata.filePath, id: doc.id});
    }
    cb(err);
  });
}

/**
 * Removes the file associated with document, if any
 *
 * @param context the execution context
 * @param doc the document
 * @param cb
 * @returns {*}
 */
function unlink(context, doc, cb) {
  if (!doc.metadata.filePath) {
    context.logger.warn('Filepath field not present', {id: doc.id});
    return cb();
  }

  fs.unlink(doc.metadata.filePath, function(err) {
    if (err) {
      context.logger.error('Error unlinking file', {err: err, path: doc.metadata.filePath});
    }
    cb(err);
  });
}

/**
 * Orchestrate the file deletion flow for a single document.
 *
 * @param doc the document attached to the file to be deleted.
 * @param cb
 */
function deleteFile(doc, cb) {

  var self = this;

  self.context.logger.info('Deleting expired file', {id: doc.id, path: doc.metadata.filePath, date: doc.created});

  self.emit(PROGRESS_EVENT, 'Deleting file ' + doc.metadata.filePath);

  async.series([
    async.apply(unlink, self.context, doc),
    async.apply(updateStatus.bind(self), self.context, doc),
    async.apply(deleteFileStore.bind(self), doc)
  ], function(err) {
    cb(err);
  });
}

/**
 * Cleaning job constructor.
 *
 * @param context the context of the execution. It can contains a custom logger and a custom query to be used to
 * retrieve the documents.
 *
 * @constructor
 */
function AppDataExportCleanerRunner(context) {
  this.context = context;
  if (!this.context.logger) {
    this.context.logger = fhConfig.getLogger();
  }
}

util.inherits(AppDataExportCleanerRunner, EventEmitter);

/**
 * Runs the cleaning job.
 */
AppDataExportCleanerRunner.prototype.run = function() {

  var self = this;

  var olderThanDate = new Date();
  olderThanDate.setDate(olderThanDate.getDate() - GRACE_TIME);

  var statusFilter = { $or: [ {status: 'complete'}, {status: 'failed'}] };
  var fileDeletedFilter = { $or: [ { 'metadata.fileDeleted': { $exists: false}}, { 'metadata.fileDeleted': { $ne: true}} ] };

  var query = self.context.query || {
    created: {$lte: olderThanDate },
    $and: [statusFilter, fileDeletedFilter]
  };

  ExportJob.find(query, function(err, docs) {
    if (err) {
      self.context.logger.error('Error executing ExportJob query', err);
      return self.emit(FAIL_EVENT, err);
    }

    if (!docs || docs.length === 0) {
      self.context.logger.info('No expired documents found');
      return self.emit(FINISH_EVENT);
    }

    async.each(docs,
      deleteFile.bind(self),
      function(err) {
        if (err) {
          self.emit(FAIL_EVENT, err);
        } else {
          self.emit(FINISH_EVENT, err);
        }
      });
  });
};

module.exports.AppDataExportCleanerRunner = AppDataExportCleanerRunner;