var forms = require('fh-forms');
var _ = require('underscore');
var fhConfig = require('fh-config');
var fs = require("fs");
var logger = require('../../../util/logger').getLogger();

function createRequestParams(req) {

  //req.appMbaasModel will already have been defined from authentication.
  //If it's not set, then you would never have gotten to this handler
  var appMbaasModel = req.appMbaasModel || {};

  //The file url will be the cloud app url.
  //:id and :fileId will be filled in by fh-forms for each file in the submission.
  var fileUrlTemplate = '/mbaas/forms/{appGuid}/submission/:id/file/:fileId'.replace('{appGuid}', appMbaasModel.guid);

  return {
    _id: req.params.id,
    pdfExportDir: fhConfig.value('fhmbaas.pdfExportDir'),
    filesAreRemote: false,
    downloadUrl: appMbaasModel.url,
    fileUriPath: fileUrlTemplate,
    location: req.appMbaasModel.coreHost,
    maxConcurrentPhantomPerWorker: fhConfig.value('fhmbaas.maxConcurrentPhantomPerWorker')
  };
}

/**
 * Handler for generating a PDF representation for an exising Submission
 *
 * @param req the HTTP request
 * @param res the HTTP response
 * @param next callback for next function in the express stack
 */
module.exports = function generatePDF(req, res, next) {
  var params = createRequestParams(req);
  logger.debug("Middleware generatePDF ", {params: params});

  forms.core.generateSubmissionPdf(_.extend(params, req.connectionOptions), function(err, submissionPdfLocation) {
    if (err) {
      logger.error("Middleware generatePDF", {error: err});
      return next(err);
    }

    logger.debug("Middleware generatePDF ", {submissionPdfLocation: submissionPdfLocation});

    //Streaming the file as an attachment
    res.download(submissionPdfLocation, '' + req.params.id + ".pdf", function(fileDownloadError) {

      //Download Complete, remove the cached file
      fs.unlink(submissionPdfLocation, function() {
        if (fileDownloadError) {
          logger.error("Middleware generatePDF ", {error: fileDownloadError});
          //If the headers have not been sent to the client, can use the error handler
          if (!res.headersSent) {
            return next(fileDownloadError);
          }
        }
      });
    });
  });
};