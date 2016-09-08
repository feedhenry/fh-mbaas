'use strict';

const UNDER_TEST = "../../../lib/services/environment/deleteEnvironmentData.js";
const proxyquire = require('proxyquire');
const assert = require('assert');

module.exports = {
  "test_delete_environment_data_no_apps": function test_delete_environment_data_no_apps(done) {
    let mocks = {
      '../../services/appmbaas/listDeployedApps': function(domain, environment, callback){
        return callback(undefined,[]);
      },
      'fh-mbaas-middleware': {
        "envMongoDb":{
          "dropEnvironmentDatabase": function(domain,environment,callback){
            return callback();
          }
        }
      }
    };
    let delEnv = proxyquire(UNDER_TEST,mocks);
    delEnv("testing","development", function complete(err) {
      assert.ok(! err, " did not expect an error deleting environment data");
      done();
    });
  },
  "test_delete_environment_data_apps": function test_delete_environment_data_apps(done) {
    let removeAppDbCalled = false;
    let dropEnvironmentDatabaseCalled = false;
    let mocks = {
      '../../services/appmbaas/listDeployedApps': function(domain, environment, callback){
        return callback(undefined,[{
          "name":"test"
        }]);
      },
      'fh-mbaas-middleware': {
        "envMongoDb":{
          "dropEnvironmentDatabase": function(domain,environment,callback){
            dropEnvironmentDatabaseCalled = true;
            return callback();
          }
        }
      },
      '../../services/appmbaas/removeAppDb.js':function(mongo, domain, app, environment, callback) {
        assert.ok(app.name,"test","expected an app with name test");
        removeAppDbCalled = true;
        return callback();
      }
    };
    let delEnv = proxyquire(UNDER_TEST,mocks);
    delEnv("testing","development", function complete(err) {
      assert.ok(! err, " did not expect an error deleting environment data");
      assert.ok(removeAppDbCalled, "expected removeAppDb to be callsed");
      assert.ok(dropEnvironmentDatabaseCalled, "expected dropEnvironmentDatabase to be callsed");
      done();
    });
  },
  "test_delete_environment_error_dropping_db": function test_delete_environment_error_dropping_db(done){
    let mocks = {
      '../../services/appmbaas/listDeployedApps': function(domain, environment, callback){
        return callback(undefined,[{
          "name":"test"
        },{
          "name":"test2"
        }]);
      },
      'fh-mbaas-middleware': {
        "envMongoDb":{
          "dropEnvironmentDatabase": function(domain,environment,callback){
            return callback();
          }
        }
      },
      '../../services/appmbaas/removeAppDb.js':function(mongo, domain, app, environment, callback) {
        assert.ok(app.name,"test","expected an app with name test");
        return callback(new Error("failed to remove db"));
      }
    };
    let delEnv = proxyquire(UNDER_TEST,mocks);
    delEnv("testing","development", function complete(err) {
      assert.ok(err, " expected an error removing the apps db");
      assert.ok(Array.isArray(err),"expected the err to be an array");
      assert.ok(err.length === 2, "expected 2 errors in the array");
      done();
    });
  }
};
