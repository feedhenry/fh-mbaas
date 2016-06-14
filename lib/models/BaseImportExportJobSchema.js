var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var _ = require('underscore');
var Schema = mongoose.Schema;
var common = require('../util/common');

/**
 *
 * Base Schema for all import / export jobs.
 *
 * This includes:
 *
 *  - App Data Import
 *  - Add Data Export
 *  - Submission Export
 *  - Submission Import
 *
 * - environment: string - environment id
 * - domain: string - the name of the domain
 * - status:
 *   - "created": model was just created, pending runner spawn (default)
 *   - "exporting": mongodump underway for an export task
 *   - "complete": mongodump or mongorestore proccess completed successfully
 *   - "failed": internal proccess failed irrecoverably (job abandoned and files deleted)
 * - step: integer - the current step inside the Status,
 *   i.e. a percent for downloading, # of exported collections for exporting, etc.
 * - totalSteps: integer - total number of steps in the Status, see step
 * - stepTimestamp: datetime - time of last step change
 * - fileSize: integer - in bytes
 * - fileDeleted: boolean - whether the file was deleted by the cleanup job
 * - filePath: string - local path for related file (at the moment we're thinking of a gzip with a single
 *   big mongodump or a tarball with multiple mongodumps)
 *
 * - fileId: string - for storing the file provided by the download service
 * - progress: Mixed - arbitrary metadata for recording internal progress on a task,
 *   i.e. for the "exporting" status, could be an array for tracking collections already exported
 * @type {Schema}
 */
var BASE_SCHEMA_OPTIONS = {
  'jobType': {
    type: String,
    required: true,
    enum: [
      'export',
      'import',
      'submissionExport'
    ]
  },
  'environment':{
    type: String,
    required: true,
    index: true
  },
  'domain':{
    type: String,
    required: true,
    index: true
  },
  'status':{
    type: String,
    required: true,
    enum: [
      'created',
      'running',
      'complete',
      'failed'
    ],
    default: 'created'
  },

  // Job progress data
  'step': Number,
  'totalSteps': Number,
  'progress': Schema.Types.Mixed,
  'metadata': Schema.Types.Mixed,
  'logs': [String]
};

const statuses = {
  "QUEUED": "created",
  "INPROGRESS": "running",
  "FINISHED": "complete",
  "FAILED": "failed"
};
const types = {
  "EXPORT": "export",
  "IMPORT": "import"
};
module.exports = function(options) {
  var BaseImportExportJobSchema = new Schema(_.extend(options, BASE_SCHEMA_OPTIONS));

  BaseImportExportJobSchema.plugin(timestamps, {
    createdAt: 'created',
    updatedAt: 'modified'
  });

  BaseImportExportJobSchema.statuses = statuses;
  BaseImportExportJobSchema.types = types;

  BaseImportExportJobSchema.methods.updateMetadata = function(field, value) {
    this.metadata[field] = value;
    this.markModified("metadata");
  };

  /**
   * Mark the job as failed
   * @param  {String}   reason the error message, can be null
   * @param  {Function} cb
   */
  BaseImportExportJobSchema.methods.fail = function(reason, cb) {
    this.set('status', BaseImportExportJobSchema.statuses.FAILED);
    if (reason) {
      this.logs.push(reason);
    }
    this.save(cb);
  };

  /**
   * Check if the job is ready to run
   * @return {Boolean}
   */
  BaseImportExportJobSchema.methods.readyToProceed = function() {
    if (this.jobType === types.IMPORT ) {
      return this.metadata && (this.metadata.uploadFinished === true);
    } else {
      return true;
    }
  };

  /**
   * Check & update the current state of the job. This is mainly for import jobs, to record the current uploaded file size.
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  BaseImportExportJobSchema.methods.checkCurrentState = function(cb) {
    var self = this;
    if (this.jobType === types.IMPORT) {
      if (this.metadata && this.metadata.filePath) {
        common.readFileSize(this.metadata.filePath, function(err, size) {
          if (err) {
            return cb(err);
          }
          self.metadata.currentFileSize = size;
          self.save(cb);
        });
      } else {
        return cb();
      }
    } else {
      return cb();
    }
  };

  /**
   * Find the jobs that are appeared to be running but actually not.
   * It will find the jobs that are:
   *   * the status is in progress
   *   * but the modified field is before (currentTime - timeout)
   * @param  {int}   timeout the job heartbeat frequency (milliseconds)
   * @param  {Function} cb
   */
  BaseImportExportJobSchema.statics.stalledJobs = function(timeout, cb) {
    var lastUpdated = new Date().getTime() - timeout;
    this.find({
      status: BaseImportExportJobSchema.statuses.INPROGRESS,
      modified:{
        $lt: new Date(lastUpdated)
      }
    }, cb);
  };

  /**
   * Find the real running jobs. Those jobs should be
   *   * status is in progress
   *   * the modified field is updated within (currentTime - timeout)
   * @param  {int}   timeout the job heartbeat frequency (milliseconds)
   * @param  {Function} cb
   */
  BaseImportExportJobSchema.statics.runningJobs = function(timeout, cb) {
    var lastUpdated = new Date().getTime() - timeout;
    this.find({
      status: BaseImportExportJobSchema.statuses.INPROGRESS,
      modified:{
        $gte: new Date(lastUpdated)
      }
    }, function(err, jobs) {
      return cb(err, jobs);
    });
  };

  /**
   * Find the next job to run.
   * @param  {Function} cb
   */
  BaseImportExportJobSchema.statics.findNextJob = function(cb) {

    // Find all the jobs that :
    // are in 'created' state and are of type 'export'
    // or are in 'created' state and have type 'import' and upladFinished  == true
    var qry = {
      status: BaseImportExportJobSchema.statuses.QUEUED,
      $or: [
        {
          jobType: types.IMPORT,
          'metadata.uploadFinished': true
        },
        {jobType: types.EXPORT}
      ]
    };

    this.find(qry).sort('created').limit(1).exec(cb);
  };

  return BaseImportExportJobSchema;
};

module.exports.statuses = statuses;
module.exports.types = types;