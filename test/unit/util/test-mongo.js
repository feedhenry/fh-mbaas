var assert = require('assert');
var proxyquire= require('proxyquire');
var util = require('util');

exports.it_should_create_mongo_db = function(cb) {

  // monsterous mock object for mongo driver itself
  var mongodb = {
    MongoClient: {
      connect: function(url, cb) {
        var mc = {
          db: function(name) {
            return {
              authenticate: function(user, pass, opts, cb1) {
                assert.equal(user, 'super');
                return cb1();
              },
              addUser: function(user, pwd, cb) {
                assert.equal(user, 'a', 'Unexpected value for user: ' + user);
                assert.equal(pwd, 'b', 'Unexpected value for pwd: ' + pwd);
                return cb();
              },
              close: function(){}
            }
          },
          close: function(){}
        };
        return cb(null, mc);
      }
    }
  };

  var mongo = proxyquire('../../../lib/util/mongo.js', {'mongodb': mongodb});
  var fhconfig = require('fh-config');
  fhconfig.setRawConfig({
    mongo:{
      host: 'dummyhost',
      port: 8000,
      auth:{
        enabled: false
      },
      admin_auth:{
        user: 'super',
        pass: 'pass'
      }
    }
  });
  mongo.createDb(fhconfig, 'a', 'b', 'bar', function(err) {
    assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
    cb();
  });
};

exports.it_should_drop_mongo_db = function(finish){
  var TEST_DB = 'testdb';
  var TEST_USER = 'testuser';

  var admin = function() {
    return {
      authenticate: function(user, pass, cb1) {
        assert.equal(user, 'super');
        return cb1();
      },
      listDatabases: function(cb){
        return cb(null, {
          databases: [{name: TEST_DB}]
        });
      },
      close: function(){}
    }
  };
  var mongodb = {
    MongoClient: {
      connect: function(url, cb) {
        var mc = {
          admin: admin,
          db: function(){
            return {
              removeUser: function(user, cb){
                assert.equal(user, TEST_USER);
                return cb();
              },
              dropDatabase: function(cb){
                return cb();
              },
              admin: admin,
              close: function(){}
            }
          },
          close: function(){}
        };
        return cb(null, mc);
      }
    }
  };

  var mongo = proxyquire('../../../lib/util/mongo.js', {'mongodb': mongodb});

  var fhconfig = require('fh-config');
  fhconfig.setRawConfig({
    mongo:{
      host: 'dummyhost',
      port: 8000,
      auth:{
        enabled: false
      },
      admin_auth:{
        user: 'super',
        pass: 'pass'
      }
    }
  });
  mongo.dropDb(fhconfig, TEST_USER, TEST_DB, function(err) {
    assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
    finish();
  });
}


