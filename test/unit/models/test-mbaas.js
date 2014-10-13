var proxyquire = require('proxyquire');
var assert = require('assert');
var util = require('util');

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
mockgoose(mongoose);

var cfg = {
  mongo: {
    host: 'localhost',
    port: 8888,
    admin_auth: {
      user: 'admin',
      pass: 'admin'
    }
  }
};

var fhconfig = require('fh-config');
fhconfig.setRawConfig(cfg);

var MockMongo = function(success){
  this.success = success;
  this.created = false;
};

MockMongo.prototype.createDb = function(fhconfig, user, pass, name, cb){
  assert.ok(user.length > 0, 'invalid db user name : ' + user);
  assert.ok(pass.length > 0, 'invalid db user pass : ' + pass);
  assert.ok(name.length > 0, 'invalid db name : ' + name);
  if(this.success){
    this.created = true;
    cb();
  } else {
    this.created = false;
    cb(new Error('failed to create db'));
  }
};

var mockMongo = new MockMongo(true);

var MbaasSchema = proxyquire('../../../lib/models/mbaas', {'../util/mongo': mockMongo});

var TEST_DOMAIN = "testDomain";
var TEST_ENV = "dev";

function validateDBConf(confA, confB){
  assert.equal(confA.host, confB.host, 'db host does not match');
  assert.equal(confA.port, confB.port, 'db port does not match');
  assert.equal(confA.name, confB.name, 'db name does not match');
  assert.equal(confA.user, confB.user, 'db user does not match');
}

exports.it_should_find_mbaas_instance = function(finish){
  mockgoose.reset();
  var Mbaas = mongoose.model('Mbaas', MbaasSchema);
  var mbaas = new Mbaas({
    domain: TEST_DOMAIN,
    environment: TEST_ENV
  });
  mbaas.save(function(err, saved){
    assert.ok(!err, util.inspect(err));

    Mbaas.findOrCreateByDomainEnv(TEST_DOMAIN, TEST_ENV, function(err, found){
       assert.ok(!err, util.inspect(err));

       assert.equal(found.domain, TEST_DOMAIN, 'domain does not match');
       assert.equal(found.environment, TEST_ENV, 'env does not match');
       assert.ok(null == found.dbConf, 'dbConf is null');

       var NEW_DOMAIN = "testDomain2";
       var NEW_ENV = "live";

       Mbaas.findOrCreateByDomainEnv(NEW_DOMAIN, NEW_ENV, function(err, created){
        assert.ok(!err, util.inspect(err));

        assert.equal(created.domain, NEW_DOMAIN, 'domain does not match');
        assert.equal(created.environment, NEW_ENV, 'env does not match');
        assert.ok(null == created.dbConf, 'dbConf is null');

        finish();
       });
    });
  }); 
};

exports.it_should_create_domain_db = function(finish){
  mockgoose.reset();
  mockMongo.success = true;
  var Mbaas = mongoose.model('Mbaas', MbaasSchema);
  var dbConf = {
    host: fhconfig.value('mongo.host'),
    port: fhconfig.value('mongo.port'),
    name: TEST_DOMAIN + '_' + TEST_ENV,
    user: TEST_DOMAIN + '_' + TEST_ENV
  }
  var mbaas = new Mbaas({
    domain: TEST_DOMAIN,
    environment: TEST_ENV
  });

  mbaas.createDb(fhconfig, function(err, results){
    assert.ok(!err, util.inspect(err));
    validateDBConf(dbConf, results);
    assert.ok(mockMongo.created, 'mongodb is not created');
    mockMongo.created = false;

    mbaas.createDb(fhconfig, function(err, results){
      assert.ok(!err, util.inspect(err));
      validateDBConf(dbConf, results);
      assert.ok(!mockMongo.created, 'mongodb is created twice');
      it_should_rollback_db_conf(finish);
    });
  });
};

function it_should_rollback_db_conf(finish){
  mockgoose.reset();
  mockMongo.success = false;
  var Mbaas = mongoose.model('Mbaas', MbaasSchema);
  var mbaas = new Mbaas({
    domain: TEST_DOMAIN,
    environment: TEST_ENV
  });
  mbaas.save(function(err){
    assert.ok(!err, util.inspect(err));
    mbaas.createDb(fhconfig, function(err, results){
      assert.ok(err != null, 'db creation should fail');
      Mbaas.findOne({domain: TEST_DOMAIN, environment: TEST_ENV}, function(err, found){
        assert.ok(!err, util.inspect(err));
        assert.ok(null != found, 'should find mbaas instance');
        assert.ok(null == found.dbConf, 'mbaas instance should not have dbConf');
        finish();
      });
    });
  });
};






