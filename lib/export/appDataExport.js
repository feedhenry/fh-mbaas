var async = require('async');

const mongoExportFunctions = require('./mongoExportFunctions');

const PROGRESS_EVENT = require('../jobs/progressPublisher').PROGRESS_EVENT;
const STATUSES = require('../models/AppdataJobSchema').statuses;


/**
 * Strip off the ditch prefix as it does not contain any information that is needed
 * to import the app.
 *
 * The ditch prefix consinst of
 * (0) fh
 * (1) <DOMAIN>-<APP_ID>-<ENV_ID>
 * (2) collection name
 *
 * and the separator is underscore. We only want (2). However the collecion name can also contain
 * underscore, so whe can't just split and take the last item.
 *
 * @param collectionName Original collection name
 */
function formatCollectionName(collectionName) {
  if (collectionName && collectionName.indexOf("_") >= 0) {
    var parts = collectionName.split("_");

    // At least two prefix items and one collection name
    // There can be more items if the collection name contains underscores
    if (parts.length >= 3) {
      return parts.splice(2).join("_");
    }

    return collectionName;
  } else {
    return collectionName;
  }
}


/**
 * This function triggers the export.
 *
 * @param context the applicaton data export context
 * @param cb
 */
function performExport(context, cb) {
  var self = this;
  var logger = context.logger;
  var index = 0;
  var total = context.collections.length;

  context.archive = {
    gzipFiles: []
  };

  async.eachSeries(context.collections, function(collectionName, cb) {
    self.emit(PROGRESS_EVENT, STATUSES.INPROGRESS, ++index, total);
    var targetFileName = formatCollectionName(collectionName) + '.bson.gz';
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

module.exports.exportData = performExport;
module.exports.formatCollectionName = formatCollectionName;
