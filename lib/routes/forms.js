var express = require('express');
var common = require('../util/common');
var formsRouter = require('./forms/forms.js');
var submissionsRouter = require('./forms/submissions.js');
var fhForms = require('fh-forms');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var logger = require('fh-config').getLogger();

var router = express.Router({
  mergeParams: true
});

//Getting The Relevant Environment Database.
router.use(fhmbaasMiddleware.envMongoDb.getOrCreateEnvironmentDatabase);

router.use(fhForms.middleware.parseMongoConnectionOptions);

router.use("/forms", formsRouter);

router.use("/submissions", submissionsRouter);

//Response Handler For All Forms Routes
router.use(function(req, res){

  logger.debug("Responding To Forms Request ", req.originalUrl, req.appformsResultPayload);
  req.appformsResultPayload = req.appformsResultPayload || {};
  var resultData = req.appformsResultPayload.data;

  //Nothing to respond with and no errors.
  if (resultData) {
    res.status(200);
    res.json(resultData);
  } else {
    res.status(204);
    res.json({});
  }
});

//Error Handler for forms routes
//jshint unused:false
router.use(function(err, req, res, next){
  logger.error("Error In Forms Request", err);
  return common.handleError(err, "Forms Error", 500, req, res);
});

module.exports = router;

