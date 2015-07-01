var proxyquire = require('proxyquire');
var assert = require('assert');
var util = require('util');
var sinon = require('sinon');
var _ = require('underscore');
var fhmbaasMiddleware = require('fh-mbaas-middleware');

var cfg = {
  mongoUrl: 'http://somemongodb',
  mongo: {
    host: 'localhost',
    port: 8888,
    admin_auth : {
      user: 'admin',
      pass: 'admin'
    }
  },
  fhdfc: {
    "dynofarm": "http://localhost:9000",
    "username":"feedhenry",
    "_password": "feedhenry101",
    "loglevel": "warn"
  }
};

var fhconfig = require('fh-config');
fhconfig.setRawConfig(cfg);

fhmbaasMiddleware.init(cfg);

var dfutils = require('../../../lib/util/dfutils');

function done(finish){
  dfutils.clearInterval();
  finish();
}

exports.tearDown = function(finish){
  done(finish);
};

exports.test_create_db = function(finish){
  var next = sinon.spy();
  var mockSave = sinon.stub();
  var createDb = sinon.stub();

  var createDatabase = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {createDb: createDb}  } ).createDbMiddleware;

  var req = {
      params: {
        appid: "someappguid",
        domain: "somedomain",
        environment: "someenvironment",
        id: "somethemeid"
      },
      appMbaasModel: {save: mockSave, name: "unit-testing"}
  };

  mockSave.callsArg(0); 
  createDb.callsArg(4);
  createDatabase(req, {}, next);

  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(createDb.calledBefore(next));
  assert.ok(mockSave.calledBefore(next));
  finish();
};

exports.test_create_db_error = function(finish){
  var next = sinon.spy();
  var mockSave = sinon.stub();
  var createDb = sinon.stub();

  var createDatabase = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {createDb: createDb}  } ).createDbMiddleware;

  var req = {
      params: {
        appid: "someappguid",
        domain: "somedomain",
        environment: "someenvironment",
        id: "somethemeid"
      },
      appMbaasModel: {save: mockSave, name: "unit-testing"}
  };

  mockSave.callsArgWith(0,new Error('mock error')); 
  createDb.callsArg(4);
  createDatabase(req, {}, next);

  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(createDb.calledBefore(next));
  assert.equal(next.args[0][0],'Error: mock error');
  finish();
};


exports.test_stop_app = function(finish){
  var next = sinon.spy();
  var stopApp = sinon.stub();
  var createDb = sinon.stub();

  var stopAppMiddle = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {createDb: createDb} , '../util/dfutils.js': {stopApp: stopApp} } ).stopAppMiddleware;

  var req = {
      params: {
        appid: "someappguid",
        domain: "somedomain",
        environment: "someenvironment",
        id: "somethemeid"
      },
      appMbaasModel: { name: "unit-testing"}
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

  var stopAppMiddle = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {createDb: createDb} , '../util/dfutils.js': {stopApp: stopApp} } ).stopAppMiddleware;

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
  assert.equal(next.args[0][0],'Error: mock error');
  finish();
};

exports.test_migrate_db = function(finish){
  var next = sinon.spy();
  var doMigrate = sinon.stub();
  var createDb = sinon.stub();

  var migrateDbMiddle = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {createDb: createDb} , '../util/ditchhelper.js': {doMigrate: doMigrate} } ).migrateDbMiddleware;

  var req = {
      params: {
        appid: "someappguid",
        cacheKey: "cahckey456",
        id: "somethemeid"
      },
      appMbaasModel: { 
        name: "unit-testing",
        domain: "somedomain",
        environment: "someenvironment",
        guid:"4562651426"
      }
  };
  
  doMigrate.callsArg(5); 
  migrateDbMiddle(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(doMigrate.calledBefore(next));
  finish();
};

exports.test_complete_migrate_db = function(finish){
  var next = sinon.spy();
  var migrateComplete = sinon.stub();
  var mockSave = sinon.stub();
  var createDb = sinon.stub();

  var migrateCompleteDb = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {createDb: createDb} , '../util/ditchhelper.js': {migrateComplete: migrateComplete} } ).completeMigrateDbMiddleware;

  var req = {
      params: {
        appid: "someappguid",
        cacheKey: "cahckey456",
        id: "somethemeid"
      },
      appMbaasModel: { 
        name: "unit-testing",
        domain: "somedomain",
        environment: "someenvironment",
        guid:"4562651426",
        save : mockSave
      }
  };
  
  migrateComplete.callsArg(5);
  // first save with error
  mockSave.callsArgWith(0, new Error('mock error'));
  migrateCompleteDb(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.equal(next.args[0][0],'Error: mock error');

  next.reset();
  migrateComplete.reset();
  mockSave.reset();
  migrateComplete.callsArg(5);
  mockSave.callsArg(0);
  migrateCompleteDb(req, {}, next);
  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.ok(migrateComplete.calledBefore(next));
  //assert.ok(mockSave.migrated);
  finish();
};

exports.test_drop_db = function(finish){
  var next = sinon.spy();
  var dropDb = sinon.stub();

  var dropDatabase = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {dropDb: dropDb}  } ).dropDbMiddleware;

  var req = {
      params: {
        appid: "someappguid",
        domain: "somedomain",
        environment: "someenvironment",
        id: "somethemeid"
      },
      appMbaasModel: { 
        name: "unit-testing", 
        migrated: false,
        dbConf: {
          user: 'user',
          name: 'name'
        }
      }
  };


  dropDb.callsArg(3);
  dropDatabase(req, {}, next);

  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  //assert.ok(dropDb.calledBefore(next));
  finish();
};

exports.test_drop_db_error = function(finish){
  var next = sinon.spy();
  var dropDb = sinon.stub();

  var dropDatabase = proxyquire('../../../lib/middleware/mbaasApp.js', { '../util/mongo.js' : {dropDb: dropDb}  } ).dropDbMiddleware;

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
        }
      }
  };


  dropDb.callsArgWith(3,new Error('mock error'));
  dropDatabase(req, {}, next);

  assert.ok(next.calledOnce, "Expected Next To Be Called Once");
  assert.equal(next.args[0][0],'Error: mock error');
  finish();
};
