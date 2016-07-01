var express = require('express');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var appMessageHandler = require('../handlers/analytics/messaging');
var fhconfig = require('fh-config');
var messagingConfig = fhconfig.getConfig().rawConfig.fhmessaging;
var logger = require('../util/logger').getLogger();
var util = require('util');
var messagingClient = require('fh-messaging-client')(messagingConfig,logger);
var db = require('./app/db.js');
var router = express.Router({
  mergeParams: true
});

/**
 * NOTE fhmbaasMiddleware.auth.app expects that you have a url that specifies path params with exactly /:environment && /:domain && /:appid you must follow this pattern otherwise
 * you will always recieve a 401.
 * It also requires the following headers 'x-fh-auth-app', 'x-fh-env-access-key'
 * //todo auth.app maybe it should be clear about its expected api and do something like auth.app(domain,env,appid) this could then return configured middleware
 */

router.use('/:domain/:environment/:projectid/:appid/appforms', require('./app/forms.js'));
router.post("/:domain/:environment/:projectid/:appid/events", fhmbaasMiddleware.auth.app, fhmbaasMiddleware.events.create,end);
router.post("/:domain/:environment/:projectid/:appid/message/:topic", fhmbaasMiddleware.auth.app, appMessageHandler(messagingClient).createAppMessage);
router.get("/:domain/:environment/:projectid/:appid/dbconnection", fhmbaasMiddleware.auth.app, db.getConnectionString, end);

function end(req,res) {
  return res.json(req.resultData);
}

// eslint-disable-next-line no-unused-vars
router.use(function appRouteErrorHandler(err, req, res, next) {
  res.statusCode = err.code || 500;
  logger.error(util.inspect(err));
  res.json(err);
});

module.exports = router;
