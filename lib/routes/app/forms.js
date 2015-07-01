var express = require('express');
var fhForms = require('fh-forms');
var logger = require('fh-config').getLogger();
var fhmbaasMiddleware = require('fh-mbaas-middleware');

var router = express.Router({
  mergeParams: true
});

//Authentication for apps.
router.use(fhmbaasMiddleware.auth.app);

//Getting The Relevant Environment Database.
router.use(fhmbaasMiddleware.envMongoDb.getEnvironmentDatabase);

router.use(fhForms.middleware.parseMongoConnectionOptions);


//Get Forms Associated With The project
//The association between projects and forms are stored in the core database.
router.get('/forms', fhmbaasMiddleware.appformsMiddleware.listProjectForms, fhForms.middleware.forms.listDeployedForms);

//Get A Single Form
router.get('/forms/:id', fhmbaasMiddleware.appformsMiddleware.listProjectForms, fhmbaasMiddleware.appformsMiddleware.checkFormAssociation, fhForms.middleware.forms.get);

//Searching For Forms
router.post('/forms/search', fhmbaasMiddleware.appformsMiddleware.listProjectForms, fhForms.middleware.forms.search);

//Submit Form Data For A Project
router.post('/forms/:id/submitFormData', fhForms.middleware.forms.submitFormData);

//Get Theme Associated With A Project
//At the moment, the full definition is in the core database.
//If themes gets lifecycle, the definition will be obtained from the environemnt database.
router.get('/themes', fhmbaasMiddleware.appformsMiddleware.getProjectTheme);

//Get Config Associated With A Project
router.get('/config', fhmbaasMiddleware.appformsMiddleware.getProjectConfig);

//Submit A Base64 File To A Submission
//This will decode the file to a binary string before streaming to the mongo database.
router.post('/submissions/:id/fields/:fieldid/files/:fileid/base64', fhForms.middleware.submissions.getRequestFileParameters, fhForms.middleware.submissions.submitFormFileBase64);

//Submit A File To A Submission
router.post('/submissions/:id/fields/:fieldid/files/:fileid', fhForms.middleware.submissions.getRequestFileParameters, fhForms.middleware.submissions.submitFormFile);

//Verify Submission And Mark As Complete
router.post('/submissions/:id/complete', fhForms.middleware.submissions.completeSubmission, appformsMiddleware.notifySubmissionComplete);

//Get The Current Submission Status
router.get('/submissions/:id/status', fhForms.middleware.submissions.status);

//Listing All Submissions
router.get('/submissions', fhForms.middleware.submissions.listProjectSubmissions);

//Search For Submissions
router.post('/submissions/search', fhForms.middleware.submissions.listProjectSubmissions);

//Get A Single Submission
router.get('/submissions/:id', fhForms.middleware.submissions.get);

//Get A Single File Contained In A Submission.
//This will be streamed to the response.
router.get('/submissions/files/:fileId', fhForms.middleware.submissions.getSubmissionFile, fhForms.middleware.submissions.processFileResponse);


/**
 * Error Handling Middleware
 */
router.use(function(err, req, res, next){//jshint unused:false
  logger.trace('Error Performing Forms Operation ', err);
  res.status(500).json({err: err});
});

/**
 * Response Handler Middleware.
 */
router.use(function(req, res){
  req.appformsResultPayload = req.appformsResultPayload || {};
  if(req.appformsResultPayload.data){
    return res.status(200).json(req.appformsResultPayload.data);
  } else {
    return res.status(204);
  }
});


module.exports = router;
