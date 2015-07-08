var proxyquire = require('proxyquire');
var assert = require('assert');
var util = require('util');

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
mockgoose(mongoose);


var fhconfig = require('fh-config');

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

exports.it_should_create_mbaas_instance = function(finish){
  mockgoose.reset();
  var Mbaas = mongoose.model('Mbaas', MbaasSchema);
  Mbaas.createModel(TEST_DOMAIN, TEST_ENV, fhconfig, function(err, created){
    assert.ok(!err, util.inspect(err));
    assert.ok(null != created);
    assert.equal(created.domain, TEST_DOMAIN);
    assert.equal(created.environment, TEST_ENV);
    assert.ok(null != created.dbConf);
    assert.equal(created.dbConf.host, 'localhost');
    assert.equal(created.dbConf.port, 27017);
    assert.equal(created.dbConf.name, TEST_DOMAIN + '_' + TEST_ENV);
    assert.equal(created.dbConf.user, TEST_DOMAIN + '_' + TEST_ENV);
    assert.ok(null != created.dbConf.pass);
    finish();
  });
};

exports.it_should_create_domain_db = function(finish){
  mockgoose.reset();
  mockMongo.success = true;
  var Mbaas = mongoose.model('Mbaas', MbaasSchema);
  var ENV = TEST_ENV + '_CREATE';

  var mbaas = new Mbaas({
    domain: TEST_DOMAIN,
    environment: ENV,
    dbConf:{
      host:'localhost',
      port: 8888,
      name: TEST_DOMAIN + '_' + ENV,
      user:'test'
    }
  });

  mbaas.save(function(err, created){
    created.createDb(fhconfig, function(err){
      assert.ok(err);

      created.dbConf.pass = 'testpass';
      created.save(function(err, newsaved){
        assert.ok(!err);

        newsaved.createDb(fhconfig, function(err){
          assert.ok(!err, util.inspect(err));

          Mbaas.createModel(TEST_DOMAIN, ENV, fhconfig, function(err){
            assert.ok(err);

            it_should_not_create_db(finish);
          });
        });
      });
    });
  });
};

function it_should_not_create_db(finish){
  mockgoose.reset();
  mockMongo.success = false;
  var Mbaas = mongoose.model('Mbaas', MbaasSchema);
  Mbaas.createModel(TEST_DOMAIN, TEST_ENV + '_CREATE2', fhconfig, function(err, created){
    assert.ok(!err, util.inspect(err));
    created.createDb(fhconfig, function(err, db){
      assert.ok(err);
      finish();
    });
  });
}






