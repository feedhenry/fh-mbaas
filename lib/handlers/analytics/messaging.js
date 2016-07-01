/**
 * handles sending app messages to fh-messaging from apps component in the mbaas.
 */
var logger = require('../../util/logger').getLogger();
var _ = require('underscore');

module.exports = function(messagingClient) {
  return {
    "createAppMessage": function appMessage(req, res, next) {
      var messages = req.body;
      var topic = req.params.topic;
      var sender = req.params.appid;
      logger.debug(topic,messages);
      if (! topic || ! messages) {
        return next({"code":400,"message":"no topic"});
      }
      res.statusCode = 201;
      res.end();
      //pre process check the messages are for the same app as sent them

      logger.debug("app messaging: request ended. Doing post request processing");

      messagingClient.createAppMessage(topic, validateAppMessages(sender,messages), function done(err) {
        if (err) {
          logger.warn("app messaging: error occurred sending message to messaging ",err);
        }
      });
    }
  };
};


function validateAppMessages(sender,messages) {
  var toValidate = Array.isArray(messages) ? messages : [messages];
  return _.filter(toValidate, function valid(m) {
    return (m && m.guid && m.guid === sender);
  });
}
