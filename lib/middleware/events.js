var fhmiddleware = require("fh-mbaas-middleware");
var fhamqpjs = require('fh-amqp-js');
var assert = require('assert');

module.exports.createAppEvent = function(eventType,message) {

  function getEvent(eventType) {
    var eventTypes = fhamqpjs.EventTypes;
    var event = eventTypes.core[eventType] || eventTypes.dynoman[eventType] || eventTypes.monit[eventType] || eventTypes.supercore[eventType] || eventTypes.openshift[eventType];
    assert.ok(event, 'Unknown eventType: ' + eventType);
    return event;
  }

  function getEventMessage(event,guid, domain, env, email, details) {
    return {
      uid: guid,
      eventType: event.eventType,
      env: env,
      details: details,
      timestamp: new Date().getTime(),
      domain: domain,
      updatedBy: email,
      eventClass: event.eventClass,
      eventLevel: event.eventLevel
    };
  }
  return function(req,res,next) {
    var guid = req.body.guid;
    var email = req.body.email;
    var domain = req.params.domain;
    var env = req.params.environment;
    var event = getEvent(eventType);
    var details = getEventMessage(event, guid, domain, env, email, {"message": message});
    fhmiddleware.events.triggerEvent(details);
    next();
  };
};
