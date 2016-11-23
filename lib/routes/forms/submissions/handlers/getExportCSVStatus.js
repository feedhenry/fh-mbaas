var fhForms = require('fh-forms');
var logger = require('../../../../util/logger').getLogger();

module.exports = function getExportCSVStatus(req, res, next) {

  fhForms.core.getCSVExportStatus(req.connectionOptions, function(err, csvExportStatus) {
    if (err) {
      logger.error({error: err}, "Error getting CSV Export Status");
      return next(err);
    }

    res.json(csvExportStatus || {});
  });
};