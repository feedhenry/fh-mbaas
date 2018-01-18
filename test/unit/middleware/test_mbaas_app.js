var assert = require('assert');
var proxyquire = require('proxyquire');
var util = require('util');
var sinon = require('sinon');

var undertest = '../../../lib/middleware/mbaasApp';



module.exports.test_create_app_db_not_for_all_app_types = function (done){
  var createCalled = false;
  var mocks = {
    '../util/mongo.js':{
      'createDb':function (config, user, pass, name,callback){
        createCalled = true;
        assert.fail("should not get here")
      }
    }
  };
  var mbaasApp = proxyquire(undertest,mocks);
  var req = {
    "appMbaasModel":{
      "type":"nonfeedhenry",
      "save": function (cb){
        assert.fail("should not get here");
      }
    }
  };
  var res = {};
  mbaasApp.createDbForAppTypes([])(req,res,function next(err,ok){
    assert.ok(!err, "did not expect an error to be returned");
    assert.ok(!ok, "did not expect a db config to be returned");
    assert.ok(createCalled == false,"db create should not be called");
    done();
  });
};


module.exports.test_create_app_db_allowed_app_types = function (done){
  var mocks = {
    '../util/mongo.js':{
      'createDb':function (config, user, pass, name,callback){
         callback();
      }
    },
    'fh-mbaas-middleware':{
      "config":function (){
        return{
          "mongo":{
            "host":"test",
            "port":"port"
          }
        }
      }
    }
  };
  var mbaasApp = proxyquire(undertest,mocks);
  var req = {
    "appMbaasModel":{
      "name":"testapp",
      "type":"openshift3",
      "save": function (cb){
        return cb();
      },
      "markModified": function (){}
    }
  };
  var res = {};
  mbaasApp.createDbForAppTypes(["openshift3"])(req,res,function next(err,ok){
    assert.ok(!err, "did not expect an error to be returned");
    assert.ok(ok,"expected a dbconfig to be returned");
    assert.ok(ok.host === "test","expected a host");
    assert.ok(ok.port === "port","expected a port");
    assert.ok(ok.hasOwnProperty("name"),"expected a name property");
    assert.ok(ok.hasOwnProperty("user"),"expected a user property");
    assert.ok(ok.hasOwnProperty("pass"),"expected a pass property");
    done();
  });
};

module.exports.test_create_does_not_create_when_dbConf_present = function (done){
  var createCalled = false;
  var mocks = {
    '../util/mongo.js':{
      'createDb':function (config, user, pass, name,callback){
        createCalled = true;
        assert.fail("should not get here")
      }
    },
    'fh-mbaas-middleware':{
      "config":function (){
        return{
          "mongo":{
            "host":"test",
            "port":"port"
          }
        }
      }
    }
  };
  var mbaasApp = proxyquire(undertest,mocks);
  var req = {
    "appMbaasModel":{
      "name":"testapp",
      "type":"openshift3",
      "dbConf":{"host":""},
      "save": function (cb){
        return cb();
      },
      "markModified": function (){}
    }
  };
  var res = {};
  mbaasApp.createDbForAppTypes(["openshift3"])(req,res,function next(err,ok){
    assert.ok(!err, "did not expect an error to be returned");
    assert.ok(! ok,"did not expect a dbconfig to be returned");
    assert.ok(createCalled == false,"db create should not have been called");
    done();
  });
};

module.exports.test_removeDbMiddlewareForMigrated = function(done){
  var dropDbStub = sinon.stub().callsArg(3);
  var mocks = {
    '../util/mongo.js': {
      'dropDb': dropDbStub
    }
  };
  var mbaasApp = proxyquire(undertest, mocks);
  var req = {
    appMbaasModel: {
      migrated: true,
      "type": "nonfeedhenry",
      domain: "test",
      dbConf: {user: "test1", name: "testdb1"},
      environment: "dev",
      name: "test-fsdfsdgdsfgdsf-dev",
      remove: function(cb){
        return cb(null, req.appMbaasModel);
      }
    }
  };
  var res = {};
  mbaasApp.removeDbMiddleware(req, res, function next(err, ok){
    assert.ok(!err, "did not expect an error to be returned");
    assert.ok(req.resultData);
    sinon.assert.calledWith(dropDbStub, sinon.match.any, 'test1', 'testdb1', sinon.match.func);
    done();
  });
};

module.exports.test_removeDbMiddlewareForOpenShift3 = function(done){
  var dropDbStub = sinon.stub().callsArg(3);
  var mocks = {
    '../util/mongo.js': {
      'dropDb': dropDbStub
    }
  };
  var mbaasApp = proxyquire(undertest, mocks);
  var req = {
    appMbaasModel: {
      migrated: false,
      "type": "openshift3",
      domain: "test",
      dbConf: {user: "test2", name: "testdb2"},
      environment: "dev",
      name: "test-fsdfsdgdsfgdsf-dev",
      remove: function(cb){
        return cb(null, req.appMbaasModel);
      }
    }
  };
  var res = {};
  mbaasApp.removeDbMiddleware(req, res, function next(err, ok){
    assert.ok(!err, "did not expect an error to be returned");
    assert.ok(req.resultData);
    sinon.assert.calledWith(dropDbStub, sinon.match.any, 'test2', 'testdb2', sinon.match.func);
    done();
  });
};


module.exports.test_removeDbMiddlewareForDitch = function(done){
  var dropDbStub = sinon.stub().callsArg(3);
  var mocks = {
    '../util/mongo.js': {
      'dropDb': dropDbStub
    },
    '../services/appmbaas/removeAppDb.js': function(mongo, domain, appModel, environment, callback){
        callback(null, {collections: ["test", "test2"]});
      }
  };
  var mbaasApp = proxyquire(undertest, mocks);
  var req = {
    appMbaasModel: {
      migrated: false,
      "type": "nonfeedhenry",
      domain: "test",
      dbConf: {user: "test", name: "testdb"},
      environment: "dev",
      name: "test-fsdfsdgdsfgdsf-dev",
      remove: function(cb){
        return cb(null, req.appMbaasModel);
      }
    }
  };
  var res = {};
  mbaasApp.removeDbMiddleware(req, res, function next(err, ok){
    assert.ok(!err, "did not expect an error to be returned " + util.inspect(err) );
    assert.ok(req.resultData);
    sinon.assert.notCalled(dropDbStub);
    done();
  });
};

module.exports.test_create_app_userdb_allowed_app_types = function (done){
  process.env.MONGODB_USERDB_NAMESPACE = "something";
  var mocks = {
    '../util/mongo.js':{
      'createDb':function (config, user, pass, name,callback){
         callback();
      }
    },
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
          }
        }
      }
    }
  };
  var mbaasApp = proxyquire(undertest,mocks);
  var req = {
    "appMbaasModel":{
      "name":"testapp",
      "type":"openshift3",
      "save": function (cb){
        return cb();
      },
      "markModified": function (){}
    }
  };
  var res = {};
  mbaasApp.createDbForAppTypes(["openshift3"])(req,res,function next(err,ok){
    assert.ok(!err, "did not expect an error to be returned");
    assert.ok(ok,"expected a dbconfig to be returned");
    assert.ok(ok.host === "host-user","expected a host");
    assert.ok(ok.port === "port-user","expected a port");
    assert.ok(ok.hasOwnProperty("name"),"expected a name property");
    assert.ok(ok.hasOwnProperty("user"),"expected a user property");
    assert.ok(ok.hasOwnProperty("pass"),"expected a pass property");
    delete process.env.MONGODB_USERDB_NAMESPACE;
    done();
  });
};

