var assert = require('assert');
var proxyquire= require('proxyquire');
var util = require('util');

exports.it_should_create_mongo_db = function(cb) {

  // monsterous mock object for mongo driver itself
  var mongodb = {
    MongoClient: function() {
      return {
        open: function(cb) {
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
    },
    Server: function(host, port, options) {
      assert.equal(host, 'dummyhost', 'unexpected host name');
    },
    ReplSetServers: function(servers, options) {
      assert.ok(false, 'should not call replset for single host');
    }
  };

  var mongo = proxyquire('../../../lib/util/mongo.js', {'mongodb': mongodb});

  var adminOpts = {
    host: 'dummyhost',
    port: 8000,
    user: 'super',
    pass: 'pass'
  };
  mongo.createDb(adminOpts, 'a', 'b', 'bar', function(err) {
    assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
    cb();
  });
};

exports.it_should_create_mongo_db_replset = function(cb) {
  var TEST_REPLSET_HOSTNAMES = ['dummyhost1','dummyhost2','10.0.0.1'];

  // monsterous mock object for mongo driver itself
  var mongodb = {
    MongoClient: function() {
      return {
        open: function(cb) {
          var mc = {
            db: function(name) {
              assert.equal(name,'bar');
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
    },
    Server: function(host, port, options) {
      assert.ok(TEST_REPLSET_HOSTNAMES.indexOf(host) >= 0, 'unexpected host name');
    },
    ReplSetServers: function(servers, options) {
      assert.equal(servers.length, TEST_REPLSET_HOSTNAMES.length, 'wrong number of hosts in replset');
    }
  };

  var mongo = proxyquire('../../../lib/util/mongo.js', {'mongodb': mongodb});

  var adminOpts = {
    host: TEST_REPLSET_HOSTNAMES.join(','),
    port: 8000,
    user: 'super',
    pass: 'pass'
  };
  mongo.createDb(adminOpts, 'a', 'b', 'bar', function(err) {
    assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
    adminOpts.port = '8000,8001,8002';
    mongo.createDb(adminOpts, 'a', 'b', 'bar', function(err){
      assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
      cb();
    });
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
    MongoClient: function() {
      return {
        open: function(cb) {
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
    },
    Server: function(host, port, options) {
      assert.equal(host, 'dummyhost', 'unexpected host name');
    },
    ReplSetServers: function(servers, options) {
      assert.ok(false, 'should not call replset for single host');
    }
  };

  var mongo = proxyquire('../../../lib/util/mongo.js', {'mongodb': mongodb});

  var adminOpts = {
    host: 'dummyhost',
    port: 8000,
    user: 'super',
    pass: 'pass'
  };
  mongo.dropDb(adminOpts, TEST_USER, TEST_DB, function(err) {
    assert.ok(!err, 'Unexpected error: ' + util.inspect(err));
    finish();
  });
}


