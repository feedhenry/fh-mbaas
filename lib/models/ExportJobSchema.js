var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Mongoose Schema for tracking an app export job
 * - appid: string - unique id for the application
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
var ExportJobSchema = new Schema({
  'appid':{
    type: String,
    required: true,
    index: true
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
      'exporting',
      'complete',
      'failed'
    ],
    default: 'created'
  },
  'step': Number,
  'totalSteps': Number,
  'fileSize': Number,
  'fileDeleted': Boolean,
  'filePath': String,
  'fileId': String,
  'progress': Schema.Types.Mixed
});

ExportJobSchema.plugin(timestamps, {
  createdAt: 'created',
  updatedAt: 'modified'
});

ExportJobSchema.statuses = {
  "QUEUED": "created",
  "INPROGRESS": "exporting",
  "FINISHED": "complete",
  "FAILED": "failed"
};

module.exports = ExportJobSchema;
