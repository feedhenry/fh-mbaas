var forms = require('fh-forms');
var _ = require('underscore');
var logger = require('../../../util/logger').getLogger();
var archiver = require('archiver');

/**
 *
 * @param {object}   submissionCsvValues
 * @param {string}   submissionCsvValues.<date-formId-formName>   CSV string for the form
 * @param {object}   res                                          Response Object
 * @param {function} next                                         Middleware Next Function
 */
function processExportResponse(submissionCsvValues, res, next) {
  var zip = archiver('zip');

  // convert csv entries to in-memory zip file and stream response

  res.set({
    'Content-type': 'application/zip',
    'Content-disposition': 'attachment; filename=submissions.zip'
  });

  logger.debug({submissionCsvValues: submissionCsvValues}, "processExportResponse");

  zip.on('error', function(err) {
    logger.error({error: err}, "_processExportResponse ");
    if (err && !res.headersSent) {
      return next(err);
    }
  });

  zip.pipe(res);

  _.each(submissionCsvValues, function(csv, form) {
    zip.append(csv, {name: form + '.csv'});
  });

  zip.finalize(function(err) {
    if (err && !res.headersSent) {
      logger.error({error: err}, "processExportResponse finalize");
      return next(err);
    }

    logger.debug("processExportResponse finalize finished");
  });
}

/**
 * Export Submissions As CSV Files Contained In A Single Zip
 *
 * @param {object}   req    Request Object
 * @param {object}   res    Response Object
 * @param {function} next   Middleware Next Function
 */
module.exports = function exportCSV(req, res, next) {

  //req.appMbaasModel will already have been defined from authentication.
  //If it's not set, then you would never have gotten to this handler
  var appMbaasModel = req.appMbaasModel || {};

  //The file url will be the cloud app url.
  //:id and :fileId will be filled in by fh-forms for each file in the submission.
  var fileUrlTemplate = '/mbaas/forms/{appGuid}/submission/:id/file/:fileId'.replace('{appGuid}', appMbaasModel.guid);

  var cloudFileUrl = appMbaasModel.url + fileUrlTemplate;

  var params = {
    "appId": req.body.projectId,
    "subid": req.body.submissionId,
    "formId": req.body.formId,
    "fieldHeader": req.body.fieldHeader,
    //The download url should be the url of the cloud app
    "downloadUrl": cloudFileUrl
  };

  logger.debug({body: req.body, params: params}, "Middleware exportCSV ");

  forms.core.exportSubmissions(req.connectionOptions, params, function(err, submissionCsvValues) {
    if (err) {
      logger.error({error: err}, "Middleware Export Submissions ");
      return next(err);
    }

    logger.debug({submissionCsvValues: submissionCsvValues.length}, "Middleware exportCSV");

    processExportResponse(submissionCsvValues, res, next);
  });
};