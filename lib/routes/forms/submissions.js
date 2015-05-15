var express = require('express');
var multer = require('multer');

//TODO: To Be Replaced By Fh-Forms
var submissionsMiddleware = require('fh-forms').middleware.submissions;
var router = express.Router();

//TODO - Multer Config
router.use(multer());

//List Form Submissions
router.get('/', submissionsMiddleware.list);

//Search For A Submission Using Custom Parameters
router.post('/search', submissionsMiddleware.search);

//Export Submissions Using Custom Parameters
router.post('/export', submissionsMiddleware.export);

router.post('/filter', submissionsMiddleware.filterSubmissions);

//Export A Submission As A PDF Document
router.get('/:id/exportpdf', submissionsMiddleware.generatePDF);

//Get A Single Submission
router.get('/:id', submissionsMiddleware.get);

//Update A Single Submission
router.put('/:id', submissionsMiddleware.update);

//Delete A Single Submission
router['delete']('/:id', submissionsMiddleware.remove);

//Get A File Related To A Submission
//TODO: The file response middleawre will moved to fh-forms
router.get('/:id/files/:fileId', submissionsMiddleware.getSubmissionFile, submissionsMiddleware.processFileResponse);

//Update A File For A Submission
//TODO: The file parsing middleawre will moved to fh-forms
router.put('/:id/fields/:fieldId/files/:fileId', submissionsMiddleware.getRequestFileParameters, submissionsMiddleware.updateSubmissionFile);

module.exports = router;
