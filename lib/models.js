var mongoose = require('mongoose');
var util = require('util');
var assert = require('assert');

module.exports = function(cfg) {

  var connection;
  var config = cfg || require('./util/config.js').getConfig().fhmbaas;
  var models = {};

  // init our Mongo database
  function init(cb) {
    if (config.database.enabled === true) {

      var db_conf = config.database;
      var connection_url = 'mongodb://' + db_conf.host + ':' + db_conf.port + '/' + db_conf.name;

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
      // TODO: Environment models won't be here, just a placeholder/example for now
      models.Environment = connection.model('Environment', require('./models/environment.js'));
    } else {
      return cb();
    }
  }

  // Close all db handles, etc
  function disconnect() {
    if (config.mongo.enabled === true && connection) {
      connection.close();
    }
  }

  return {
    init: init,
    disconnect: disconnect,
    models: models
  };
};