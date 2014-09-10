var mongoose = require('mongoose');
var util = require('util');
var assert = require('assert');

module.exports = function(cfg) {

  var connection;
  var config = cfg || require('./util/config.js').getConfig().fhmbaas;
  var admin = require('./mbaas/admin.js')(config);

  // init our Mongo database
  function init(cb) {
    if (config.mongo.enabled === true) {
      connection = mongoose.createConnection(config.mongo.url);

      var firstCallback = true;

      connection.on('error', function(err) {
        if (firstCallback) {
          firstCallback = false;
          return cb(err);
        } else {
          console.error('Mongo error: ' + util.inspect(err));
        }
      });

      connection.once('open', function callback () {
        if (firstCallback) {
          firstCallback = false;
          admin.init(connection);
          return cb(null, connection);
        }
      });

      connection.on('disconnected', function () {
        //console.log('GOT disconnected');
      });
    } else {
      admin.init();
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
    admin: admin,
    disconnect: disconnect
  };
};