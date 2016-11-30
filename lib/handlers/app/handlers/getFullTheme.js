var forms = require('fh-forms');
var logger = require('../../../util/logger').getLogger();

/**
 * Get A Theme Associated With A Project
 * @param {object}   req    Request Object
 * @param {object}   res    Response Object
 * @param {function} next   Middleware Next Function
 */
module.exports = function getFullTheme(req, res, next) {
  var params = {
    appId: req.params.projectid || req.params.id
  };

  logger.debug("formProjects: getting theme...", params);

  forms.core.getAppTheme(_.extend(req.connectionOptions, params), function (err, theme) {
    if (err) {
      return next(err);
    }

    logger.debug("Returned theme: ", theme);

    if (theme) {
      return res.statusCode(200).json(theme);
    } else {
      return res.statusCode(204).end();
    }
  });
};