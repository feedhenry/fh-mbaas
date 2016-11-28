var fhForms = require('fh-forms');
var logger = require('../../../../util/logger').getLogger();

module.exports = function getExportCSVStatus(req, res, next) {

  fhForms.core.resetExportCSV(req.connectionOptions, function(err, csvExportStatus) {
    if (err) {
      logger.error({error: err}, "Error resetting CSV Export Status");
      return next(err);
    }

    res.json(csvExportStatus || {});
  });
};