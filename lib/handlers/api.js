'use strict';

var express = require('express');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var fhconfig = require('fh-config');
var auth = require('../middleware/auth.js');
var middleware = require('../middleware/mbaasApp.js');
var fhamqpjs = require('fh-amqp-js');
var metricsRouter = require('./analytics/metricsRouter.js');
var statsRouter = require('./stats/stats_router.js');
var eventMiddleware = require('../middleware/events');
var appdataRouter = require('./app/data.js');
var deleteEnvironmentData = require('../services/environment/deleteEnvironmentData.js');
var logger = require('../util/logger.js').getLogger();

var router = new express.Router({
  mergeParams: true
});

var DB_CREATION_APP_TYPES = fhconfig.value("auto_create_app_dbs");


router.use(auth.admin(fhconfig));


router.use('/metrics', metricsRouter);
router.use('/stats', statsRouter);

//to avoid race conditions, we will only set the db conf values on model creation. Since we have a unique composite index added for domain and environment, once the first record is created, the second creation will fail.
//then we will only create the mongdo db if the data creation is successful. If the mongo db creation is failed for whatever reason, we will delete the model.
router.post('/:domain/:environment/db', fhmbaasMiddleware.envMongoDb.getOrCreateEnvironmentDatabase, function(req, res) {
  return res.json({uri: req.mongoUrl});
});

router.post('/apps/:domain/:environment/:appname/migratedb', fhmbaasMiddleware.app.findOrCreateMbaasApp, middleware.createDbMiddleware, middleware.stopAppMiddleware, middleware.migrateDbMiddleware, middleware.notifyAppDbMigration('start'), function(req, res) {
  return res.json(req.createDbResult);
});

//delete app databases associated with this domain and environment. Delete the environment datatabase and the environment db config
router["delete"]('/:domain/:environment', function deleteEnvironment(req, res,next) {
  let domain = req.params.domain;
  let environment = req.params.environment;
  deleteEnvironmentData(domain,environment,function done(err){
    if (err){
      logger.error("error deleting environment data ",err);
      return next(err);
    }
    res.json({"message":"environment data deleted"});
  });
});

//Deleting The App From The MbaaS.
router['delete']('/apps/:domain/:environment/:appname',eventMiddleware.createAppEvent(fhamqpjs.EventTypes.CORE_APP_DELETE_REQUESTED, "delete requested core to mbaas"),
  fhmbaasMiddleware.app.findMbaasApp,
  middleware.removeDbMiddleware, function(req, res) {
    return res.json(req.resultData);
  });

router.get('/apps/:domain/:environment/:appname/env', fhmbaasMiddleware.app.findMbaasApp, middleware.modelsInfo, function(req, res) {
  return res.json(req.resultData);
});

//This route stores deployment information to fhmbaas
router.post('/apps/:domain/:environment/:appname/deploy', fhmbaasMiddleware.app.findOrCreateMbaasApp, fhmbaasMiddleware.app.updateMbaasApp, middleware.createDbForAppTypes(DB_CREATION_APP_TYPES), function(req, res) {
  //Finished and no errors.
  res.json(req.appMbaasModel.toJSON());
});

//Routes for dealing with services
router.use('/:domain/:environment/services', require('../routes/services/router.js'));


//All Of The Routes Required For Forms Operations For Each Mbaas Environmnet
router.use('/:domain/:environment/appforms', require('./forms.js'));


/**
 * Error Handler For Admin API Requests
 */
router.use(function(err, req, res, next) { // jshint unused:false
  return next(err,req,res);
});


router.use('/:domain/:environment/:appid/data', appdataRouter);

router.get("/:domain/:environment/apps/:guid/events", fhmbaasMiddleware.events.list,end);
router.post("/:domain/:environment/apps/:guid/events", fhmbaasMiddleware.events.create,end);
router.get('/:domain/:environment/apps/:guid/alerts', fhmbaasMiddleware.alerts.list,end);
router.post('/:domain/:environment/apps/:guid/alerts', fhmbaasMiddleware.alerts.create,end);
router.post('/:domain/:environment/apps/:guid/alerts/testEmails', fhmbaasMiddleware.alerts.testEmails, end);
router.put('/:domain/:environment/apps/:guid/alerts/:id', fhmbaasMiddleware.alerts.update,end);
router["delete"]('/:domain/:environment/apps/:guid/alerts/:id', fhmbaasMiddleware.alerts.del,end);
router.get('/:domain/:environment/apps/:guid/notifications', fhmbaasMiddleware.notifications.list,end);

function end(req,res) {
  return res.json(req.resultData);
}



module.exports = router;
