var proxyquire = require('proxyquire');
var assert = require('assert');
var util = require('util');
var sinon = require('sinon');

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
mockgoose(mongoose);

var cfg = {
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

var mongo = require('../../../lib/util/mongo');
var mockMongo = sinon.mock(mongo);
var createDb = mockMongo.expects('createDb');
var dropDb = mockMongo.expects('dropDb');

var dfutils = require('../../../lib/util/dfutils');
var ditchhelper = require('../../../lib/util/ditchhelper');

var mockDfutils = sinon.stub(dfutils, 'stopApp');
var mockDitch = sinon.mock(ditchhelper);
var doMigrate = mockDitch.expects('doMigrate');
var migrateComplete = mockDitch.expects('migrateComplete');

var AppMbaasSchema = proxyquire('../../../lib/models/appMbaas', {'../util/mongo': mockMongo, '../util/dfutils':mockDfutils, '../util/ditchhelper': mockDitch});

var DOMAIN = "appmbaas_unittest_domain";
var ENVIRONMENT = "appmbaas_unittest_env";
var APPNAME = "appmbaas_unittest_app";


function done(finish){
  dfutils.clearInterval();
  finish();
}

exports.it_should_create = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  AppMbaas.createModel(APPNAME, DOMAIN, ENVIRONMENT, fhconfig, function(err, created){
    assert.ok(!err, util.inspect(err));

    assert.equal(created.domain, DOMAIN, 'app mbaas instance domain does not match');
    assert.equal(created.environment, ENVIRONMENT, 'app mbaas instance environment does not match');

    assert.ok(null != created.dbConf);
    assert.ok(null != created.dbConf.host);
    assert.ok(null != created.dbConf.port);
    assert.ok(null != created.dbConf.name);
    assert.ok(null != created.dbConf.user);
    assert.ok(null != created.dbConf.pass);

    AppMbaas.createModel(APPNAME, DOMAIN, ENVIRONMENT, fhconfig, function(err){
      assert.ok(err);
      done(finish);
    });
  });
};

exports.test_stop_app = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME + '_test_stop_app',
    domain: DOMAIN,
    environment: ENVIRONMENT
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));
    var cb = sinon.spy();
    mockDfutils.callsArg(3);
    saved.stopApp(cb);
    mockDfutils.calledWith(DOMAIN, ENVIRONMENT, APPNAME + '_test_lock');
    assert(cb.calledOnce);

    mockDfutils.reset();
    var error = new Error('mock error');
    mockDfutils.callsArgWith(3, error);
    saved.stopApp(cb);

    assert.ok(cb.calledWith(error));
    done(finish);
  });
};

exports.test_migrate_db = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME + '_test_migrate_db',
    domain: DOMAIN,
    environment: ENVIRONMENT
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));
    var cb = sinon.spy();
    var cacheKey = 'tetscachekey';
    var appGuid = 'testappguid';

    cb.reset();
    doMigrate.reset();
    doMigrate.callsArg(5);
    saved.migrateDb(cacheKey, appGuid, function(){
      assert.equal(doMigrate.callCount, 1);
      doMigrate.withArgs(DOMAIN, ENVIRONMENT, APPNAME + '_test_migrate_db', cacheKey, appGuid);
      doMigrate.verify();
      done(finish);
    });
  });
};

exports.test_complete_migrate = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME + '_test_complete_migrate',
    domain: DOMAIN,
    environment: ENVIRONMENT
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    var cb = sinon.spy();

    var cacheKey = 'tetscachekey';
    var appGuid = 'testappguid';

    cb.reset();
    migrateComplete.reset();
    migrateComplete.callsArg(5);
    saved.completeMigrate(cacheKey, appGuid, function(){
      assert.ok(saved.migrated);
      assert.equal(migrateComplete.callCount, 1);
      migrateComplete.withArgs(DOMAIN, ENVIRONMENT, APPNAME + '_test_complete_migrate', cacheKey, appGuid);
      migrateComplete.verify();

      done(finish);
    });
  });
};

exports.test_create_db = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME + '_test_create_db',
    domain: DOMAIN,
    environment: ENVIRONMENT,
    dbConf:{
      host:'localhost',
      port:8888,
      name:'testdb',
      user:'testuser'
    }
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    createDb.reset();
    createDb.callsArg(4);
    saved.createDb(fhconfig, function(err, conf){
      assert.ok(err);

      saved.dbConf.pass = 'testpass';
      saved.save(function(err, newsaved){

        newsaved.createDb(fhconfig, function(err,conf){
          assert.ok(!err, util.inspect(err));
          assert.ok(null != conf);

          assert.equal(createDb.callCount, 1);
          createDb.calledWith({host: 'localhost', port: 8888, user: 'admin', pass: 'admin'});

          createDb.reset();
          createDb.callsArgWith(4, new Error('mock error'));

          newsaved.createDb(fhconfig, function(err, conf){
            assert.ok(err);
            done(finish);
          });
        });
      });
    });
  });
};

exports.test_drop_db = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME + '_test_drop_db',
    domain: DOMAIN,
    environment: ENVIRONMENT,
    dbConf: {
      user: 'testuser',
      name: 'testdb'
    }
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    dropDb.reset();
    dropDb.callsArg(3);
    saved.removeDb(fhconfig, function(err){
      assert.ok(!err, util.inspect(err));
      assert.equal(dropDb.callCount, 1);
      dropDb.calledWith({host: 'localhost', port: 8888, user: 'admin', pass: 'admin'}, 'testuser', 'testdb');
      
      dropDb.reset();
      dropDb.callsArgWith(3, new Error('mock error'));
      saved.removeDb(fhconfig, function(err){
        assert.ok(err);
        done(finish);
      });
    });
  });
};