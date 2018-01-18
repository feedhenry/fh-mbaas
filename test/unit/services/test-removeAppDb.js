"use strict";

const proxyquire = require('proxyquire');
const UNDER_TEST = "../../../lib/services/appmbaas/removeAppDb.js";
const assert = require('assert');
const util = require('util');

module.exports = {
  "test_remove_app_db_ok": function test_remove_app_db_ok(done) {
    let appModelRemoved = false;
    let mongoDropCalled = false;
    let remove = proxyquire(UNDER_TEST, {});
    let appModel = {
      "type": "openshift3",
      "dbConf": {
        "user": "test"
      },
      "remove": function (cb) {
        appModelRemoved = true;
        return cb();
      }
    };
    let mongo = {
      "dropDb": function (config, user, name, callback) {
        mongoDropCalled = true;
        return callback();
      }
    };

    remove(mongo, "testing", appModel, "dev", function complete(err) {
      assert.ok(!err, " did not expect an error removing app db " + util.inspect(err));
      assert.ok(appModelRemoved, "expected the appmodel to have been removed");
      assert.ok(mongoDropCalled, "expected the mongoDrop to have been called");
      done();
    });
  },
  "test_remove_app_db_error": function test_remove_app_db_error(done) {
    let remove = proxyquire(UNDER_TEST, {});
    let appModel = {
      "type": "openshift3",
      "dbConf": {
        "user": "test"
      },
      "remove": function (cb) {
        return cb(new Error("failed to remove db"));
      }
    };
    let mongo = {
      "dropDb": function (config, user, name, callback) {
        return callback();
      }
    };
    remove(mongo,"testing",appModel,"dev",function complete(err){
      assert.ok(err, "expected an error removing the app db");
      done();
    });
  },
  "test_remove_app_db_not_os3": function test_remove_app_db_not_os3(done) {
    let ditchCalled = false;
    let remove = proxyquire(UNDER_TEST, {
      '../../util/ditchhelper.js':{
        "removeAppCollection":function (appname, cb){
          ditchCalled = true;
          return cb();
        }
      }
    });
    let appModel = {
      "type": "dynoman",
      "dbConf": {
        "user": "test"
      },
      "remove": function (cb) {
        return cb();
      }
    };
    remove({},"testing",appModel,"dev",function complete(err){
      assert.ok(! err, "did not expect an error removing the app db");
      assert.ok(ditchCalled, "expected ditch to be called");
      done();
    });
  },
  "test_remove_app_userdb_ok": function test_remove_app_db_ok(done) {
    process.env.MONGODB_USERDB_NAMESPACE = "something";
    let appModelRemoved = false;
    let mongoDropCalled = false;
    var mocks = {
      'fh-mbaas-middleware':{
        "config":function (){
          return{
            "mongo":{
              "host":"test",
              "port":"port"
            },
            "mongo_userdb":{
              "host":"host-user",
              "port":"port-user"
            },
            "mongoUserUrl": "mongodb://user:pass@host:port/userdb"
          }
        }
      }
    };
    let remove = proxyquire(UNDER_TEST, mocks);
    let appModel = {
      "type": "openshift3",
      "dbConf": {
        "user": "test"
      },
      "remove": function (cb) {
        appModelRemoved = true;
        return cb();
      }
    };
    let mongo = {
      "dropDb": function (config, user, name, callback) {
        mongoDropCalled = true;
        return callback();
      }
    };

    remove(mongo, "testing", appModel, "dev", function complete(err) {
      assert.ok(!err, " did not expect an error removing app db " + util.inspect(err));
      assert.ok(appModelRemoved, "expected the appmodel to have been removed");
      assert.ok(mongoDropCalled, "expected the mongoDrop to have been called");
      delete process.env.MONGODB_USERDB_NAMESPACE;
      done();
    });
  },
};
