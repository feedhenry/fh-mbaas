'use strict';

const UNDER_TEST = "../../../lib/services/environment/deleteEnvironmentData.js";
const proxyquire = require('proxyquire');
const assert = require('assert');

module.exports = {
  "test_delete_environment_data_no_apps": function test_delete_environment_data_no_apps(done) {
    let dropEnvironmentDatabaseCalled = 0;
    let mocks = {
      '../../services/appmbaas/listDeployedApps': function(domain, environment, callback){
        return callback(undefined,[]);
      },
      'fh-mbaas-middleware': {
        "envMongoDb":{
          "dropEnvironmentDatabase": function(domain,environment,callback){
            dropEnvironmentDatabaseCalled++ ;
            assert.equal(domain,"testing","should have been called with testing domain");
            assert.equal(environment,"development","should have been called with development environment");
            return callback();
          }
        }
      }
    };
    let delEnv = proxyquire(UNDER_TEST,mocks);
    delEnv("testing","development", function complete(err) {
      assert.ok(! err, " did not expect an error deleting environment data");
      assert.ok(dropEnvironmentDatabaseCalled === 1,"expected dropEnvironmentDatabase to be called once");
      done();
    });
  },
  "test_delete_environment_data_apps": function test_delete_environment_data_apps(done) {
    let removeAppDbCalled = 0;
    let dropEnvironmentDatabaseCalled = 0;
    let mocks = {
      '../../services/appmbaas/listDeployedApps': function(domain, environment, callback){
        return callback(undefined,[{
          "name":"test"
        }]);
      },
      'fh-mbaas-middleware': {
        "envMongoDb":{
          "dropEnvironmentDatabase": function(domain,environment,callback){
            dropEnvironmentDatabaseCalled++;
            return callback();
          }
        }
      },
      '../../services/appmbaas/removeAppDb.js':function(mongo, domain, app, environment, callback) {
        assert.ok(app.name,"test","expected an app with name test");
        removeAppDbCalled++;
        return callback();
      }
    };
    let delEnv = proxyquire(UNDER_TEST,mocks);
    delEnv("testing","development", function complete(err) {
      assert.ok(! err, " did not expect an error deleting environment data");
      assert.ok(removeAppDbCalled === 1, "expected removeAppDb to be called once");
      assert.ok(dropEnvironmentDatabaseCalled === 1, "expected dropEnvironmentDatabase to be called once");
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
