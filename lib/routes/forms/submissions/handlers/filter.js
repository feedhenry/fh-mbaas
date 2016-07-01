var forms = require('fh-forms');
var logger = require('../../../../util/logger').getLogger();

/**
 * Filtering Submissions
 * @param req
 * @param res
 * @param next
 */
module.exports = function filterSubmissions(req, res, next) {
  var filterParams = {
    formId: req.body.formId,
    appId: req.body.appId,
    paginate: {
      //Populated by express-paginate middleware
      page: req.query.page,
      limit: req.query.limit,
      filter: req.query.filter
    }
  };

  logger.debug("Middleware filterSubmissions ", {params: filterParams});

  forms.core.getSubmissions({
    uri: req.mongoUrl
  }, filterParams, function(err, submissions) {
    if (err) {
      return next(err);
    }

    res.json(submissions || {});
  });
};
