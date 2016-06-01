var async = require('async');

const mongoExportFunctions = require('../mongoExportFunctions');

const PROGRESS_EVENT = require('../../jobs/progressPublisher').PROGRESS_EVENT;
const STATUSES = require('../../models/SubmissionDataJobSchema').statuses;


/**
 * This function triggers the export.
 *
 * @param context the applicaton data export context
 * @param cb
 */
function exportSubmissions(context, cb) {
  var self = this;
  var logger = context.logger;
  var index = 0;
  var total = context.collections.length;

  context.archive = {
    gzipFiles: []
  };

  logger.info("Exporting Submissions Collections");

  async.eachSeries(context.collections, function(collectionName, cb) {
    self.emit(PROGRESS_EVENT, STATUSES.INPROGRESS, ++index, total);
    var targetFileName = collectionName + '.bson.gz';
    mongoExportFunctions.mongoExportWrapper(self, context, collectionName, targetFileName, index, total, cb);
  }, function(err) {
    if (!err) {
      mongoExportFunctions.createExportArchive(context, cb);
    } else {
      logger.error('Error exporting from mongo', err);
      return cb(err, context);
    }
  });
}

module.exports.exportData = exportSubmissions;
