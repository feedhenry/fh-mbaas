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

exports.it_should_find_or_create = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME,
    domain: DOMAIN,
    environment: ENVIRONMENT
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    AppMbaas.findOrCreateByName(APPNAME, DOMAIN, ENVIRONMENT, function(err, found){
      assert.ok(!err, util.inspect(err));
      assert.ok(!found.isNew, 'instance should not be new');

      assert.equal(found.domain, DOMAIN, 'app mbaas instance domain does not match');
      assert.equal(found.environment, ENVIRONMENT, 'app mbaas instance environment does not match');

      var NEW_APPNAME = 'appmbaas_unittest_app2';
      AppMbaas.findOrCreateByName(NEW_APPNAME, DOMAIN, ENVIRONMENT, function(err, newInstance){
        assert.ok(!err, util.inspect(err));

        assert.equal(NEW_APPNAME, newInstance.name, 'app mbaas instance name does not match');

        done(finish);
      });
    });
  });
};

exports.it_should_lock_and_unlock = function(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME + '_test_lock',
    domain: DOMAIN,
    environment: ENVIRONMENT
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));
    assert.ok(!saved.locked, 'app mbaas instance should not be locked');

    saved.lock(function(err){
      assert.ok(!err, util.inspect(err));
      assert.ok(saved.locked, 'app mbaas instance should be locked');
      saved.unlock(function(err){
        assert.ok(!err, util.inspect(err));
        assert.ok(!saved.locked, 'app mbaas instance should be unlocked');
        done(finish);
      });
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

    saved.migrated = true;
    saved.migrateDb(cacheKey, appGuid, cb);
    assert.equal(doMigrate.callCount, 0);
    assert.ok(cb.calledOnce);

    cb.reset();
    doMigrate.reset();
    saved.migrated = false;
    saved.locked = true;
    saved.migrateDb(cacheKey, appGuid, cb);
    assert.equal(doMigrate.callCount, 0);
    assert.ok(cb.calledOnce);

    cb.reset();
    doMigrate.reset();
    saved.migrated = false;
    saved.locked = false;
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

    saved.locked = false;
    saved.completeMigrate(cacheKey, appGuid, cb);
    assert.equal(migrateComplete.callCount, 0);
    assert.ok(cb.calledOnce);

    saved.locked = true;
    cb.reset();
    migrateComplete.reset();
    migrateComplete.callsArg(5);
    saved.completeMigrate(cacheKey, appGuid, function(){
      assert.ok(saved.migrated);
      assert.ok(!saved.locked);
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
    environment: ENVIRONMENT
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    assert.equal(saved.dbConf, null);

    createDb.reset();
    createDb.callsArg(4);
    saved.createDb(fhconfig, function(err, conf){
      assert.ok(!err, util.inspect(err));
      assert.ok(null != saved.dbConf);
      assert.ok(null != conf);

      assert.equal(createDb.callCount, 1);
      createDb.calledWith({host: 'localhost', port: 8888, user: 'admin', pass: 'admin'});

      saved.createDb(fhconfig, function(err, conf){
        assert.equal(createDb.callCount, 1);
        assert.ok(null != conf);

        test_create_db_rollback(finish);

      });
    });
  });
};

function test_create_db_rollback(finish){
  mockgoose.reset();
  var AppMbaas = mongoose.model('AppMbaas', AppMbaasSchema);
  var appmbaas = new AppMbaas({
    name: APPNAME + '_test_create_db_rollback',
    domain: DOMAIN,
    environment: ENVIRONMENT
  });
  appmbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    assert.equal(saved.dbConf, null);

    createDb.reset();
    createDb.callsArgWith(4, new Error('failed'));
    saved.createDb(fhconfig, function(err, conf){
      assert.ok(null == saved.dbConf);

      assert.equal(createDb.callCount, 1);
      createDb.calledWith({host: 'localhost', port: 8888, user: 'admin', pass: 'admin'});
      
      done(finish);
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
      
      done(finish);
    });
  });
};