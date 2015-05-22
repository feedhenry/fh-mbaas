var express = require('express');

var submissionsMiddleware = require('fh-forms').middleware.submissions;
var router = express.Router({
  mergeParams: true
});

//List Form Submissions
router.get('/', submissionsMiddleware.list);

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
