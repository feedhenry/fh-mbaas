var async = require('async');
var fhForms = require('fh-forms');
var _ = require('underscore');
var logger = require('../../../util/logger').getLogger();

/**
 *
 * Handler for verifying and completing a form submission.
 *
 * Also notifies any subscribers to the form submission.
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function completeSubmission(req, res, next) {
  var params = {
    submission: {
      submissionId: req.params.id
    }
  };

  logger.debug("Middleware completeSubmission ", {params: params});

  fhForms.core.completeFormSubmission(_.extend(params, req.connectionOptions), function(err, completionResult) {
    if(err) {
      logger.warn("Error Completing Submission", err);
      return next(err);
    }

    //If the submission is still pending (e.g. there are missing files etc) then send the data back to the user.
    if(completionResult.status === 'pending') {
      return res.status(200).json(completionResult);
    }

    //Getting the data required for sending email
    fhForms.core.getSubmissionEmailData(req.connectionOptions, {
      _id: req.params.id
    }, function(err, submissionEmailData) {
      if (err) {
        logger.warn("Error getting submission", err);
        return next(err);
      }

      completionResult.formSubmission = submissionEmailData.formSubmission;
      completionResult.notificationMessage = submissionEmailData.notificationMessage;

      req.appformsResultPayload = {
        data: completionResult
      };

      //Passsing control to the next middleware that is used for notifying subscribers to completed submissions
      return next();
    });
  });
};