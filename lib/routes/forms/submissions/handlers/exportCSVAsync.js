var fhForms = require('fh-forms');
var async = require('async');
var path = require('path');
var fhConfig = require('fh-config');
var fs = require('fs');
var _ = require('underscore');
var logger = require('../../../../util/logger').getLogger();
var archiver = require('archiver');
var storage = require('../../../../storage');

/**
 *
 * Registering an exported zip file for export.
 *
 * @param connectionOptions
 * @param submissionZipFilePath
 */
function registerExportedFileForDownload(connectionOptions, submissionZipFilePath) {

  storage.registerFile(submissionZipFilePath, function(err, registeredFile) {
    if (err) {
      logger.error({error: err}, "Error registering submission file");
    }

    //Want to generate a url to download the zip file
    storage.generateURL(registeredFile._id, null, null, function(err, submissionZipUrl) {
      if (err) {
        logger.error({error: err, registeredFile: registeredFile}, "Error generating submission file url");
        return;
      }

      //Finish, set the export status to complete and keep url.
      fhForms.core.updateCSVExportStatus(connectionOptions, {
        status: fhForms.CONSTANTS.SUBMISSION_CSV_EXPORT.STATUS_COMPLETE,
        message: "Exported submissions available to download <a id='submission_export_log_modal_download_link' href='" + submissionZipUrl.url + "'>here</a>"
      });
    });
  });
}


/**
 * Cleaning up an exported submissions file
 * @param path
 * @param cb
 */
function cleanUpSubmissionFile(path, cb) {
  fs.stat(path, function(err, fileStats) {
    if (err) {
      logger.warn({error: err}, "Error reading file " + path);
      return cb(err);
    }

    //No file
    if (!fileStats) {
      return cb();
    }

    //file exists, remove it.
    fs.unlink(path, function(err) {
      if (err) {
        logger.warn({error: err}, "Error unlinking file " + path);
      }

      return cb(err);
    });
  });
}


/**
 * Function for processing submissions into a zip file containing csv files.
 * @param params
 * @param params.domain           The domain exported for
 * @param params.environment      The environment ID exported for
 * @param params.connectionOptions Mongo Connection Options
 * @param params.connectionOptions.uri Mongo connection string
 * @param exportedSubmissionCSVs  The export CSV strings for each form
 * @private
 */
function processExportResponse(params, exportedSubmissionCSVs) {
  exportedSubmissionCSVs = exportedSubmissionCSVs || {};

  fhForms.core.updateCSVExportStatus(params.connectionOptions, {
    status: fhForms.CONSTANTS.SUBMISSION_CSV_EXPORT.STATUS_INPROGRESS,
    message: "Compressing Exported Submissions"
  });

  var fileName = params.domain + "_" + params.environment + "_" + "submissioncsvexport.zip";

  var exportedZipFilePath = path.join(fhConfig.value("fhmbaas.temp_forms_files_dest"), fileName);

  cleanUpSubmissionFile(exportedZipFilePath, function(err) {
    if (err && err.code !== "ENOENT") {
      fhForms.core.updateCSVExportStatus(params.connectionOptions, {
        status: fhForms.CONSTANTS.SUBMISSION_CSV_EXPORT.STATUS_ERROR,
        message: "Error cleaning up submission file",
        error: err
      });

      return;
    }

    var zipFileStream = fs.createWriteStream(exportedZipFilePath);
    var zip = archiver('zip');

    zipFileStream.on('error', function(err) {
      logger.error({error: err}, "Error zipping exported submissions");

      fhForms.core.updateCSVExportStatus(params.connectionOptions, {
        status: fhForms.CONSTANTS.SUBMISSION_CSV_EXPORT.STATUS_ERROR,
        message: "Error compressing exported submissions",
        error: err
      });
    });

    zipFileStream.on('close', function() {
      logger.debug("Finished Export CSV Zip");

      fhForms.core.updateCSVExportStatus(params.connectionOptions, {
        status: fhForms.CONSTANTS.SUBMISSION_CSV_EXPORT.STATUS_INPROGRESS,
        message: "Finished compressing exported submissions. Registering the ZIP file for download."
      });

      registerExportedFileForDownload(params.connectionOptions, exportedZipFilePath);
    });

    zip.pipe(zipFileStream);

    _.each(exportedSubmissionCSVs, function(csv, form) {
      zip.append(csv, {name: form + '.csv'});
    });

    logger.debug("Finalising Export CSV Zip");

    zip.finalize();
  });
}


/**
 *
 * Handler to start the export process for CSVs. This will not wait for the CSV export to start
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function exportCSVAsync(req, res, next) {
  req.body = req.body || {};

  var exportParams = {
    "appId" : req.body.projectId,
    "subid": req.body.subid,
    "formId": req.body.formId,
    "fieldHeader": req.body.fieldHeader,
    "downloadUrl": req.body.fileUrl,
    "filter": req.body.filter,
    "query": req.body.query,
    "wantRestrictions": false
  };

  async.waterfall([
    function startExportAsync(cb) {
      fhForms.core.startCSVExport(req.connectionOptions, function(err, updatedCSVExportStatus) {
        if (err) {
          logger.error({error: err}, "Error starting CSV Export");
        }

        return cb(err, updatedCSVExportStatus);
      });
    }
  ], function(err, updatedCSVExportStatus) {
    if (err) {
      logger.error({error: err}, "Error starting CSV Export");
      return next(err);
    }

    //Responding to the http request and starting the submission CSV export.
    res.json(updatedCSVExportStatus || {});

    fhForms.core.exportSubmissions(_.extend({asyncCSVExport: true}, req.connectionOptions), exportParams, function(err, submissionCsvValues) {
      if (err) {
        fhForms.core.updateCSVExportStatus(req.connectionOptions, {
          status: fhForms.CONSTANTS.SUBMISSION_CSV_EXPORT.STATUS_ERROR,
          message: "Error exporting submissions",
          error: err
        });
        logger.warn({error: err}, "Error exporting submissions ");
        return;
      }

      logger.info("Submission CSV Values Exported");

      processExportResponse({
        domain: req.params.domain,
        environment: req.params.environment,
        connectionOptions: req.connectionOptions
      }, submissionCsvValues);
    });
  });
};
