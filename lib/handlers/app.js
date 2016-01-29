var express = require('express');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var appMessageHandler = require('../handlers/analytics/messaging');
var fhconfig = require('fh-config');
var messagingConfig = fhconfig.getConfig().rawConfig.fhmessaging;
var logger = require('fh-config').getLogger();
var messagingClient = require('fh-messaging-client')(messagingConfig,logger);
var db = require('./app/db.js');
var router = express.Router({
  mergeParams: true
});

/**
 * NOTE fhmbaasMiddleware.auth.app expects that you have a url that specifies path params with exactly /:environment && /:domain && /:appid you must follow this pattern otherwise
 * you will always recieve a 401.
 * It also uses the following envvars   'x-fh-auth-app', 'x-fh-env-access-key'
 * //todo auth.app maybe it should be clear about its expected api and do something like auth.app(domain,env,appid) this could then return configured middleware
 */



router.use('/:domain/:environment/:projectid/:appid/appforms', require('./app/forms.js'));
router.post("/:domain/:environment/:projectid/:appid/events", fhmbaasMiddleware.auth.app,fhmbaasMiddleware.events.create,end);
router.post("/:domain/:environment/:projectid/:appid/message/:topic", fhmbaasMiddleware.auth.app, appMessageHandler(messagingClient).createAppMessage);
router.post("/:domain/:environment/:projectid/:appid/dbconnectionsstring", fhmbaasMiddleware.auth.app, db.getConnectionString, end);


function end(req,res){
    return res.json(req.resultData);
}



router.use(function appRouteErrorHandler (err,req,res,next){
  if(err.code) res.statusCode = err.code || 500;
  res.json(err);
});


module.exports = router;
