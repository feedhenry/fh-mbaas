var proxyquire = require('proxyquire');
var assert = require('assert');
var util = require('util');
var sinon = require('sinon');
var _ = require('underscore');
var fhmbaasMiddleware = require('fh-mbaas-middleware');

var cfg = {
  mongoUrl: 'mongodb://localhost:27017/test-fhmbaas-accept',
  mongo: {
    host: 'localhost',
    port: 8888,
    name: 'fh-mbaas-test',
    admin_auth: {
      user: 'admin',
      pass: 'admin'
    }
  },
  fhdfc: {
    "dynofarm": "http://localhost:9000",
    "username": "feedhenry",
    "_password": "feedhenry101",
    "loglevel": "warn",
    "cache_timeout": 1234123
  }
};

var fhconfig = require('fh-config');
fhconfig.setRawConfig(cfg);


var dfutils = require('../../../lib/util/dfutils');

function done(finish){
  dfutils.clearInterval();
  finish();
}

exports.tearDown = function(finish){
  done(finish);
};


exports.test_middleware_config = function(finish){
  fhmbaasMiddleware.setConfig(cfg, function(err){
    assert.ok(!err, 'Error in middleware config');
    finish();
  });
};

exports.test_create_db = function(finish){
  var next = sinon.spy();
  var mockSave = sinon.stub();
  var createDb = sinon.stub();
  var mockMod = sinon.spy();

  var createDatabase = proxyquire('../../../lib/middleware/mbaasApp.js',
    {'../util/mongo.js': {createDb: createDb}}).createDbMiddleware;

  var req = {
    params: {
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
      id: "somethemeid",
      type:"feedhenry"
    },
    cacheKey: "2321312321",
    body: {'cacheKey': '2321312321', securityToken: 'testToken'},
    appMbaasModel: {
      save: mockSave,
      markModified: mockMod,
      name: "unit-testing",
      migrated: 'true',
      type:"feedhenry"
    }
  };

  mockSave.callsArg(0);
  createDb.callsArg(4);
  createDatabase(req, req, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(mockMod.calledWith('dbConf'));
  assert.ok(createDb.calledOnce, "Expected createDb To Be Called Once");
  assert.ok(createDb.calledBefore(next));
  assert.ok(mockSave.calledBefore(next));
  finish();
};

exports.test_create_db_error = function(finish){
  var next = sinon.spy();
  var mockSave = sinon.stub();
  var createDb = sinon.stub();
  var mockMod = sinon.spy();

  var createDatabase = proxyquire('../../../lib/middleware/mbaasApp.js', {'../util/mongo.js': {createDb: createDb}}).createDbMiddleware;

  var req = {
    params: {
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
      id: "somethemeid",
      cacheKey: "2321312321"
    },
    body: {'cacheKey':'2321312321', securityToken: 'testToken'},
    appMbaasModel: {save: mockSave, markModified: mockMod, name: "unit-testing","type":"feedhenry"}
  };

  mockSave.callsArgWith(0, new Error('mock error'));
  createDb.callsArg(4);
  createDatabase(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(mockMod.calledWith('dbConf'));
  assert.ok(createDb.calledBefore(next));
  assert.equal(next.args[0][0], 'Error: mock error');
  finish();
};


exports.test_stop_app = function(finish){
  var next = sinon.spy();
  var stopApp = sinon.stub();
  var createDb = sinon.stub();

  var stopAppMiddle = proxyquire('../../../lib/middleware/mbaasApp.js', {
    '../util/mongo.js': {createDb: createDb},
    '../util/dfutils.js': {stopApp: stopApp}
  }).stopAppMiddleware;

  var req = {
    params: {
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
      id: "somethemeid"
    },
    appMbaasModel: {name: "unit-testing"}
  };

  stopApp.callsArg(3);
  stopAppMiddle(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(stopApp.calledBefore(next));
  finish();
};

exports.test_stop_app_error = function(finish){
  var next = sinon.spy();
  var stopApp = sinon.stub();
  var createDb = sinon.stub();

  var stopAppMiddle = proxyquire('../../../lib/middleware/mbaasApp.js', {
    '../util/mongo.js': {createDb: createDb},
    '../util/dfutils.js': {stopApp: stopApp}
  }).stopAppMiddleware;

  var req = {
    params: {
      id: "somethemeid"
    },
    appMbaasModel: {
      name: "unit-testing",
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
    }
  };

  stopApp.callsArgWith(3, new Error('mock error'));
  stopAppMiddle(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(stopApp.calledBefore(next));
  assert.equal(next.args[0][0], 'Error: Failed to stop app unit-testing');
  finish();
};

exports.test_migrate_db = function(finish){
  var next = sinon.spy();
  var doMigrate = sinon.stub();
  var createDb = sinon.stub();

  var migrateDbMiddle = proxyquire('../../../lib/middleware/mbaasApp.js', {
    '../util/mongo.js': {createDb: createDb},
    '../util/ditchhelper.js': {doMigrate: doMigrate}
  }).migrateDbMiddleware;

  var req = {
    params: {
      appid: "someappguid",
      securityToken: "securityToken",
      id: "somethemeid"
    },
    appMbaasModel: {
      name: "unit-testing",
      domain: "somedomain",
      environment: "someenvironment",
      guid: "4562651426"
    },
    body: {
      securityToken: "securityToken",
      coreHost: "http://corehost.feedhenry.com"
    },
  };

  doMigrate.callsArg(6);
  migrateDbMiddle(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(doMigrate.calledBefore(next));
  finish();
};

exports.test_drop_db = function(finish){
  var next = sinon.spy();
  var mockRemove = sinon.stub();
  var dropDb = sinon.stub();

  var removeDatabase = proxyquire('../../../lib/middleware/mbaasApp.js', {'../util/mongo.js': {dropDb: dropDb}}).removeDbMiddleware;

  var req = {
    params: {
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
      id: "somethemeid"
    },
    appMbaasModel: {
      name: "unit-testing",
      migrated: true,
      dbConf: {
        user: 'user',
        name: 'name'
      },
      remove: mockRemove,
      appMbaasModel: {
        name: "unit-testing",
        migrated: true,
        dbConf: {
          user: 'user',
          name: 'name'
        },
        remove: mockRemove
      }
    }
  };


  mockRemove.callsArg(0);
  dropDb.callsArg(3);
  removeDatabase(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(dropDb.calledOnce, "Expected dropDb To Be Called Once");
  assert.ok(mockRemove.calledOnce, "Expected remove To Be Called Once");
  assert.ok(dropDb.calledBefore(next));
  finish();
};

exports.test_drop_db_error = function(finish){
  var next = sinon.spy();
  var mockRemove = sinon.stub();
  var dropDb = sinon.stub();

  var removeDatabase = proxyquire('../../../lib/middleware/mbaasApp.js', {'../util/mongo.js': {dropDb: dropDb}}).removeDbMiddleware;

  var req = {
    params: {
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
      id: "somethemeid"
    },
    appMbaasModel: {
      name: "unit-testing",
      migrated: true,
      dbConf: {
        user: 'user',
        name: 'name'
      },
      remove: mockRemove,
      appMbaasModel: {
        name: "unit-testing",
        migrated: true,
        dbConf: {
          user: 'user',
          name: 'name'
        },
        remove: mockRemove
      }
    }
  };


  mockRemove.callsArg(0);
  dropDb.callsArgWith(3, new Error('mock error'));
  removeDatabase(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.equal(next.args[0][0], 'Error: Request to remove db for app unit-testing');
  finish();
};


exports.test_get_models_info = function(finish){
  var next = sinon.spy();
  var createDb = sinon.stub();
  var mockMbaas = sinon.stub();
  var mockEnv = sinon.stub();

  var mockFind = function(){
    return {
      findOne: function(args, cb){
        return cb();
      }
    }
  }

  var modelsinfo = proxyquire('../../../lib/middleware/mbaasApp.js', {
    '../util/mongo.js': {createDb: createDb},
    'fh-mbaas-middleware': {mbaas: mockFind},
    '../models/appEnv.js': {appEnv: mockEnv}
  }).modelsInfo;

  var req = {
    params: {
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
      id: "somethemeid"
    },
    appMbaasModel: {
      name: "unit-testing",
      migrated: true,
      dbConf: {
        user: 'user',
        name: 'name'
      },
      type: 'feedhenry',
      mbaasUrl: 'test-url'
    },
    originalUrl: 'testoriginalurl'
  };

  modelsinfo(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(req.resultData.env, "Should expect request object resultData to be populated");
  finish();
};

exports.test_get_models_info_error = function(finish){
  var next = sinon.spy();
  var createDb = sinon.stub();
  var mockMbaas = sinon.stub();
  var mockEnv = sinon.stub();

  var mockFind = function(){
    return {
      findOne: function(args, cb){
        return cb(new Error('Mock Error'));
      }
    }
  }

  var modelsinfo = proxyquire('../../../lib/middleware/mbaasApp.js', {
    '../util/mongo.js': {createDb: createDb},
    'fh-mbaas-middleware': {mbaas: mockFind},
    '../models/appEnv.js': {appEnv: mockEnv}
  }).modelsInfo;

  var req = {
    params: {
      appid: "someappguid",
      domain: "somedomain",
      environment: "someenvironment",
      id: "somethemeid"
    },
    appMbaasModel: {
      name: "unit-testing",
      migrated: true,
      dbConf: {
        user: 'user',
        name: 'name'
      },
      type: 'feedhenry',
      mbaasUrl: 'test-url'
    },
    originalUrl: 'testoriginalurl'
  };

  modelsinfo(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.equal(next.args[0][0], "Error: Failed to look up Mbaas/AppMbaas instance");
  finish();
};


