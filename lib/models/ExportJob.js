var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Mongoose Schema for tracking an app export job
 * - appid: string - unique id for the application
 * - environment: string - environment id
 * - domain: string - the name of the domain
 * - status:
 *   - "uploading": a data upload from a client related to this import task is occurring
 *   - "exporting": mongodump underway for an export task
 *   - "importing": mongorestore underway for an import task
 *   - "complete": mongodump or mongorestore proccess completed successfully
 *   - "failed": internal proccess failed irrecoverably (job abandoned and files deleted)
 *   - "download token created": a token has been created for downloading the exported data
 *   - "downloading": a data download to a client related to this export task is occurring
 * - step: integer - the current step inside the Status,
 *   i.e. a percent for downloading, # of exported collections for exporting, etc.
 * - totalSteps: integer - total number of steps in the Status, see step
 * - stepTimestamp: datetime - time of last step change
 * - fileSize: integer - in bytes
 * - filePath: string - local path for related file (at the moment we're thinking of a gzip with a single
 *   big mongodump or a tarball with multiple mongodumps)
 *
 * - fileId: string - for storing the file provided by the download service
 * - progress: Mixed - arbitrary metadata for recording internal progress on a task,
 *   i.e. for the "exporting" status, could be an array for tracking collections already exported
 * @type {Schema}
 */
var ExportJob = new Schema({
  'appid':{
    type: String,
    required: true,
    index: true,
    unique: true
  },
  'environment':{
    type: String,
    required: true,
    index: true,
    unique: true
  },
  'domain':{
    type: String,
    required: true,
    index: true,
    unique: true
  },
  'status':{
    type: String,
    required: true
  },
  'step': Number,
  'totalSteps': Number,
  'fileSize': Number,
  'fileDeleted': Boolean,
  'filePath': String,
  'fileId': String,
  'progress': Schema.types.Mixed
});

ExportJob.plugin(timestamps, {
  createdAt: 'created',
  modifiedAt: 'modified'
});

module.exports.ExportJob = ExportJob;
