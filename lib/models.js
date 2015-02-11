var mongoose = require('mongoose');
var util = require('util');
var fhconfig = require('fh-config');

module.exports = function() {

  var connection;
  var models = {};

  // init our Mongo database
  function init(cb) {
    if (fhconfig.bool('mongo.enabled')) {

      var connection_url = fhconfig.mongooseConnectionString();

      connection = mongoose.createConnection(connection_url);

      var firstCallback = true;

      connection.on('error', function(err) {
        if (firstCallback) {
          firstCallback = false;
          return cb(err);
        } else {
          console.error('Mongo error: ' + util.inspect(err));
        }
      });

      connection.once('open', function callback() {
        console.log('Mongoose Connected.');
        if (firstCallback) {
          firstCallback = false;
          return cb(null, connection);
        }
      });

      connection.on('disconnected', function() {
        console.log('GOT disconnected');
      });

      // Load schemas
      models.Mbaas = connection.model('Mbaas', require('./models/mbaas.js'));
      models.AppMbaas = connection.model('AppMbaas', require('./models/appMbaas.js'));
    } else {
      return cb();
    }
  }

  // Close all db handles, etc
  function disconnect(cb) {
    if (fhconfig.bool('mongo.enabled') && connection) {
      connection.close(cb);
    } else {
      cb();
    }
  }

  return {
    init: init,
    disconnect: disconnect,
    models: models
  };
};