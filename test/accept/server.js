var assert = require('assert');
var util = require('util');
var express = require('express');
var app = express();

// enable mongo
var mongoose = require('mongoose');
var config = require('lib/util/config.js');
var cfg = config.getConfig();
cfg.fhmbaas.mongo.enabled = true;
cfg.fhmbaas.mongo.url = "mongodb://localhost/test-fhmbaas-accept";
config.setConfig(cfg);

var mbaas = require('lib/mbaas.js')();

app.use('/sys', require('lib/sys.js')());
app.use('/admin', require('lib/admin-route.js')(mbaas));

var server;

function dropDatabase(connection, cb) {
  // TODO - drop stuff here..
  //connection.collections['teams'].drop(function (err) {
    cb();  // err purposely ignored
  //});
}

exports.setUp = function(finish){
  mbaas.init(function(err, connection) {
    assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
    dropDatabase(connection, function(err) {
      assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
      var port = 8819;
      server = app.listen(port, function(){
        console.log("Test App started at: " + new Date() + " on port: " + port);
        finish();
      });
    });
  });
}

exports.tearDown = function(finish) {
  mbaas.disconnect();
  if (server) {
    server.close(function() {
      finish();
    });
  }else finish();
};
