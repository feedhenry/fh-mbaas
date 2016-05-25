var forms = require('fh-forms');
var async = require('async');
var _ = require('underscore');
var fhConfig = require('fh-config');
var url = require('url');
var fs = require("fs");
var logger = fhConfig.getLogger();

function createRequestParams(req) {
  return {
    _id: req.params.id,
    pdfExportDir: fhConfig.value('fhmbaas.pdfExportDir'),
    filesAreRemote: false,
    fileUriPath: req.fileUriPath,
    location: req.appMbaasModel.coreHost
  };
}

/**
 * Handler for generating a PDF representation for an exising Submission
 *
 * @param req the HTTP request
 * @param res the HTTP response
 * @param next callback for next function in the express stack
 */
function generatePDF(req, res, next){
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
}

module.exports = {
  generatePDF: generatePDF
};
