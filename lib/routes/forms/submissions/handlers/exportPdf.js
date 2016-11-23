var fhForms = require('fh-forms');
var fs = require('fs');
var async = require('async');
var fhConfig = require('fh-config');
var logger = require('../../../../util/logger').getLogger();

/**
 * exportPDF - Exporting A Single submission as a PDF file.
 *
 * @param  {object}   req     Request Object
 * @param  {object}   res     Response Object
 * @param  {function} next    Middleware next function.
 */
module.exports = function exportPDF(req, res, next) {
  async.waterfall([
    function generateSubmissionPdf(cb) {
      fhForms.core.generateSubmissionPdf({
        uri: req.mongoUrl,
        _id: req.params.id,
        pdfExportDir: fhConfig.value('fhmbaas.pdfExportDir'),
        filesAreRemote: false,
        location: req.body.coreLocation,
        maxConcurrentPhantomPerWorker: fhConfig.value('fhmbaas.maxConcurrentPhantomPerWorker')
      }, cb);
    }], function(err, pdfFileLocation) {
    if (err) {
      return next(err);
    }
    var fileReadStream = fs.createReadStream(pdfFileLocation);

    fileReadStream.on('end', function() {
      fs.unlink(pdfFileLocation, function() {
        logger.debug("Submission File " + pdfFileLocation + " removed");
      });
    });

    fileReadStream.on('error', function(error) {
      logger.error("Error sending PDF file ", {
        error: error,
        pdfFileLocation: pdfFileLocation
      });
    });

    //If
    if (!res.headersSent) {
      //Want to pipe the response to the result
      //Setting content-disposition as an attachement for nice browser compatibility.
      res.writeHead(200, {
        "Content-Disposition": 'attachment; filename="' + req.params.id + '.pdf"',
        "Content-Type": 'application/pdf'
      });
      fileReadStream.pipe(res);
    } else {
      fileReadStream.close();
    }

  });
};