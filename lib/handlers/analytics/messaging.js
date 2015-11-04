/**
 * handles sending app messages to fh-messaging from apps component in the mbaas.
 */
  
var logger = require('fh-config').getLogger();
var util = require('util');
var async =require('async'); 


module.exports = function (messagingClient) {
  return {
    "createAppMessage": function appMessage(req, res, next) {
      var messages = req.body;
      var topic = req.params.topic;
      if(! topic || ! messages){
        return next({"code":400,"message":"no topic"})
      }
      res.statusCode = 201;
      res.end();
      //pre process check the messages are for the same app as sent them

      logger.debug("app messaging: request ended. Doing post request processing");
      //after request ended process the message and log the result
      async.waterfall([
        function checkMessagesValid(callback) {
          validateAppMessages(req.params.appid, messages, function (results) {
            callback(undefined, results);
          });
        },
        function sendToMessagging(messages, callback) {
          messagingClient.createAppMessage(topic, messages, callback);
        }
      ], function done(err) {
        if (err) logger.warn("app messaging: error occurred sending message to messaging " + util.inspect(err));
      });

    }
  };
};


function validateAppMessages(sender,messages,callback){
  var toValidate = Array.isArray(messages) ? messages : [messages];
  async.filter(toValidate, function valid(m,cb){
    var is = (m && m.guid && m.guid === sender);
    cb(is);
  },callback);
}