var proxyquire = require('proxyquire');
var assert = require('assert');
var util = require('util');
var sinon = require('sinon');

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
var _ = require('underscore');
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
var APPGUID = "appmbaasguid";
var APPAPIKEY = "appapikey";
var COREHOST = "https://some.core.host.com";
var MBAASURL = "https://mbaas.somembaas.com";
var APPTYPE = "feedhenry";

var mbaasConfig = {
  domain: DOMAIN,
  environment: ENVIRONMENT,
  fhconfig: fhconfig,
  guid: APPGUID,
  apiKey: APPAPIKEY,
  coreHost: COREHOST,
  mbaasUrl: MBAASURL,
  type: APPTYPE,
  accessKey: mongoose.Types.ObjectId()
};


function done(finish){
  dfutils.clearInterval();
  finish();
}

exports.it_should_create = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  AppMbaas.createModel(_.extend(_.clone(mbaasConfig), {name: APPNAME}), function(err, created){
    assert.ok(!err, util.inspect(err));

    assert.equal(created.domain, DOMAIN, 'app mbaas instance domain does not match');
    assert.equal(created.environment, ENVIRONMENT, 'app mbaas instance environment does not match');
    assert.equal(created.guid, APPGUID);
    assert.equal(created.coreHost, COREHOST);
    assert.ok(_.isString(created.accessKey.toString()), "Expected A String Access Key");
    assert.equal(created.apiKey, APPAPIKEY);

    assert.ok(!created.dbConf, "Expected No Db conf when creating a new app model");
    AppMbaas.createModel(_.extend(_.clone(mbaasConfig), {name: APPNAME}), function(err){
      assert.ok(err, "Expected a duplicate entry error");
      done(finish);
    });
  });
};

exports.test_stop_app = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas(_.extend(_.clone(mbaasConfig), {name: APPNAME + '_test_stop_app'}));
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

  var appmbaas = new AppMbaas(_.extend(_.clone(mbaasConfig), {name: APPNAME + '_test_migrate_db'}));
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

  var appmbaas = new AppMbaas(_.extend(_.clone(mbaasConfig), {name: APPNAME + '_test_complete_migrate'}));
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

  var appmbaas = new AppMbaas( _.extend(_.clone(mbaasConfig), {name: APPNAME + '_test_create_db'}));
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    createDb.reset();
    createDb.callsArg(4);
    saved.createDb(fhconfig, function(err, conf){
      assert.ok(!err, "Unexpected Error: " + err);

      assert.ok(null != conf);
      assert.ok(null != conf.host);
      assert.ok(null != conf.port);
      assert.ok(null != conf.name);
      assert.ok(null != conf.user);
      assert.ok(null != conf.pass);

      saved.createDb(fhconfig, function(err, errConf){
        assert.ok(err, "Expected An Error");
        assert.ok(!errConf);

        assert.equal(createDb.callCount, 1);
        createDb.calledWith({host: 'localhost', port: 8888, user: conf.user, pass: conf.pass});

        done(finish);
      });
    });
  });
};

exports.test_create_db_error = function(finish){
  mockgoose.reset();
  createDb.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);

  var appmbaas = new AppMbaas(_.extend(_.clone(mbaasConfig), {name: APPNAME + '_test_create_db_error', dbConf:{
    host:'localhost',
    port:8888,
    name:'testdb',
    user:'testuser'
  }}));
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    saved.createDb(fhconfig, function(err, conf){
      assert.ok(err);
      done(finish);
    });
  });
};

exports.test_drop_db = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);

  var appmbaas = new AppMbaas(_.extend(_.clone(mbaasConfig), {name: APPNAME + '_test_drop_db',  dbConf: {
    user: 'testuser',
    name: 'testdb'
  }}));
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    dropDb.reset();
    dropDb.callsArg(3);
    saved.removeDb(fhconfig, function(err){
      assert.ok(!err, util.inspect(err));
      assert.equal(dropDb.callCount, 1);
      dropDb.calledWith({host: 'localhost', port: 8888, user: 'admin', pass: 'admin'}, 'testuser', 'testdb');
      
      done(finish);
    });
  });
};

exports.test_drop_db_error = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);

  var appmbaas = new AppMbaas(_.extend(_.clone(mbaasConfig), {name: APPNAME + '_test_drop_db_error',  dbConf: {
    user: 'testuser',
    name: 'testdb'
  }}));
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    dropDb.reset();
    dropDb.callsArgWith(3, new Error('mock error'));
    saved.removeDb(fhconfig, function(err){
      assert.ok(err);
      done(finish);
    });
  });
};