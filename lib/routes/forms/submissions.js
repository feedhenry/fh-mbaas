var express = require('express');
var fhForms = require('fh-forms');
var submissionsMiddleware = fhForms.middleware.submissions;
var formsMiddleware = fhForms.middleware.forms;

var router = express.Router({
  mergeParams: true
});

//List Form Submissions
router.get('/', submissionsMiddleware.list);

//Creating A New Submission
router.post('/', function(req, res, next){
  //Setting some studio defaults to mark the submission as created by studio
  req.params.projectid =  req.body.appId || "FHC";

  next();
}, formsMiddleware.submitFormData);

//Marking A Pending Submission As Complete
router.post('/:id/complete', submissionsMiddleware.completeSubmission);

//Search For A Submission Using Custom Parameters
router.post('/search', submissionsMiddleware.search);

//Export Submissions Using Custom Parameters
router.post('/export', submissionsMiddleware.exportCSV);

router.post('/filter', submissionsMiddleware.filterSubmissions);

//Export A Submission As A PDF Document
router.get('/:id/exportpdf', submissionsMiddleware.generatePDF);

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

module.exports = router;
