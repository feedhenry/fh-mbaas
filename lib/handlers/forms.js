var express = require('express');
var common = require('../util/common');
var formsRouter = require('./forms/forms.js');
var submissionsRouter = require('../routes/forms/submissions/router');
var themesRouter = require('./forms/themes.js');
var projectsRouter = require('./forms/projects.js');
var dataSourcesRouter = require('../routes/forms/dataSources/router');
var fhForms = require('fh-forms');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var logger = require('../util/logger').getLogger();

var router = express.Router({
  mergeParams: true
});

//Getting The Relevant Environment Database.
router.use(fhmbaasMiddleware.envMongoDb.getOrCreateEnvironmentDatabase);

router.use(fhForms.middleware.parseMongoConnectionOptions);

router.use("/forms", formsRouter);

router.use("/submissions", submissionsRouter());

router.use("/themes", themesRouter);

router.use("/apps", projectsRouter);

router.use("/data_sources", dataSourcesRouter);

//Response Handler For All Forms Routes
router.use(function(req, res) {

  logger.debug("Responding To Forms Request ", req.originalUrl);
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
//express required 4 parameters for the error handler, DO NOT CHANGE!
router.use(function(err, req, res, next) {
  logger.error("Error In Forms Request", err );
  return common.handleError(err, err.message || 'Forms Error', err.httpCode || 500, req, res);
});

module.exports = router;
