var forms = require('fh-forms');
var logger = require('../../../../util/logger').getLogger();
/**
 * Handler for listing All Submissions
 * @param req
 * @param res
 * @param next
 */
module.exports = function list(req, res, next) {
  var listParams = {
    paginate: {
      //Populated by express-paginate middleware
      page: req.query.page,
      limit: req.query.limit,
      filter: req.query.filter
    }
  };

  logger.debug("Handler Submissions List ", {connectionOptions: req.connectionOptions, listParams: listParams});
  forms.core.getSubmissions({
    uri: req.mongoUrl
  }, listParams, function(err, submissionsResult) {
    if (err) {
      logger.error("Error listing submissions", err);
      return next(err);
    }

    res.json(submissionsResult || {});
  });
};
