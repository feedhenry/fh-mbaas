var mongoose = require('mongoose');
var util = require('util');
var assert = require('assert');
var config = require('./util/config.js');

module.exports = function() {

  var connection;
  var models = {};

  // init our Mongo database
  function init(cb) {
    if (config.yes('fhmbaas.mongo.enabled')) {

      var connection_url = config.getMongooseUrl();

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
    if (config.yes('fhmbaas.mongo.enabled') && connection) {
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