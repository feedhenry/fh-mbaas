var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var _ = require('underscore');
var Schema = mongoose.Schema;


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
      'import'
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


module.exports = function(options) {
  var BaseImportExportJobSchema = new Schema(_.extend(options, BASE_SCHEMA_OPTIONS));

  BaseImportExportJobSchema.plugin(timestamps, {
    createdAt: 'created',
    updatedAt: 'modified'
  });

  BaseImportExportJobSchema.statuses = {
    "QUEUED": "created",
    "INPROGRESS": "running",
    "FINISHED": "complete",
    "FAILED": "failed"
  };

  BaseImportExportJobSchema.types = {
    "EXPORT": "export",
    "IMPORT": "import"
  };

  BaseImportExportJobSchema.methods.updateMetadata = function(field, value) {
    this.metadata[field] = value;
    this.markModified("metadata");
  };

  return BaseImportExportJobSchema;
};

