var express = require('express');
var fhForms = require('fh-forms');
var paginate = require('express-paginate');
var submissionsMiddleware = fhForms.middleware.submissions;
var formsMiddleware = fhForms.middleware.forms;
var fhConfig = require('fh-config');
var handlers = require('./handlers');
var CONSTANTS = require('../../../constants');
var dataExport = require('./handlers/export');
var multer = require('multer');

module.exports = function() {
  var router = express.Router({
    mergeParams: true
  });

  //Multipart Form Request Parser
  router.use(multer({
    dest: fhConfig.value("fhmbaas.temp_forms_files_dest")
  }));

  //List Form Submissions (Paginated)
  router.get('/', paginate.middleware(fhConfig.value(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_DEFAULT_LIMIT_KEY), fhConfig.value(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_MAX_LIMIT_KEY)), handlers.list);

  //Creating A New Submission
  router.post('/', function(req, res, next) {
    //Setting some studio defaults to mark the submission as created by studio
    req.params.projectid =  req.body.appId || "FHC";

    next();
  }, formsMiddleware.submitFormData);

  //Marking A Pending Submission As Complete
  router.post('/:id/complete', submissionsMiddleware.completeSubmission);

  //Search For A Submission Using Custom Parameters (Paginated)
  router.post('/search', paginate.middleware(fhConfig.value(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_DEFAULT_LIMIT_KEY), fhConfig.value(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_MAX_LIMIT_KEY)), handlers.search);

  router.post('/export/async', handlers.exportCSVAsync);

  router.get('/export/async/status', handlers.getExportCSVStatus);

  router.post('/export/async/reset', handlers.resetExportCSV);

  //Export Submissions Using Custom Parameters
  router.post('/export', submissionsMiddleware.exportCSV);

  //Filtering Submissions (Paginated)
  router.post('/filter', paginate.middleware(fhConfig.value(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_DEFAULT_LIMIT_KEY), fhConfig.value(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_MAX_LIMIT_KEY)), handlers.filter);

  //Export A Submission As A PDF Document
  router.post('/:id/exportpdf', handlers.exportPDF);

  //Get A Single Submission
  router.get('/:id', submissionsMiddleware.get);

  //Update A File For A Submission
  router.post('/:id/fields/:fieldId/files/:fileId', submissionsMiddleware.getRequestFileParameters, submissionsMiddleware.addSubmissionFile);

  //Update A File For A Submission
  router.put('/:id/fields/:fieldId/files/:fileId', submissionsMiddleware.getRequestFileParameters, submissionsMiddleware.updateSubmissionFile);

  //Update A Single Submission
  router.put('/:id', submissionsMiddleware.update);

  //Delete A Single Submission
  router['delete']('/:id', submissionsMiddleware.remove);

  //Get A File Related To A Submission
  router.get('/:id/files/:fileId', submissionsMiddleware.getSubmissionFile, submissionsMiddleware.processFileResponse);

  // Submission export handlers
  router.use('/data', dataExport);

  return router;
};
