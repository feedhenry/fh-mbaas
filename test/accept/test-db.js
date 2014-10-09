var request = require("request");
var util = require('util');
var assert = require('assert');
var common = require('./common');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var TEST_DOMAIN = 'fhmbaas-accept-test-domain';
var TEST_ENV = 'test';

function connectDb(url, cb){
  MongoClient.connect(url, function(err, db){
    assert.ok(!err, 'Can not connect to mongodb : ' + util.inspect(err));
    return cb(err, db);
  });
}


function verifyDb(url, cb){
  connectDb(url, function(err, db){
    db.createCollection('verify_collection', {}, function(err, collection){
      assert.ok(!err, 'can not create collection in db : ' + url);
      collection.insert({a:1}, function(err){
        assert.ok(!err, 'can not write to collection : ' + url);
        collection.drop(function(err){
          assert.ok(!err, 'can not drop collection : ' + url);
          db.close(true, function(){
            cb();  
          });
        });
      });
    });
  });
}

exports.it_should_return_unauthorised = function(finish){
  var url = util.format('%s%s/%s/%s/db', common.baseUrl, 'api/mbaas', TEST_DOMAIN, TEST_ENV);
  request.post({url: url, json: {}}, function(err, response){
    assert.equal(response.statusCode, 401, 'request should be rejected');
    finish();
  });
};

exports.it_should_return_db_url = function(finish){
  var url = util.format('%s%s/%s/%s/db', common.baseUrl, 'api/mbaas', TEST_DOMAIN, TEST_ENV);
  var params = {
    url: url,
    headers:{
      'x-fh-service-key': 'testkey'
    },
    json:{}
  };
  request.post(params, function(err, response, body){
    assert.ok(!err, 'db create request should success');
    assert.equal(response.statusCode, 200);
    var new_db_url = body.uri;
    //call it again and should get the same reponse
    request.post(params, function(err, response, body){
      assert.ok(!err, 'db create request should success');
      assert.equal(response.statusCode, 200); 
      var another_url = body.uri;
      assert.equal(new_db_url, another_url, 'db url does not match');
      verifyDb(new_db_url, function(){
        finish();  
      });
    });
  });
};

var TEST_APP_NAME = 'fhmbaas-accept-test-appname';
exports.it_should_migrate_db = function(finish){
  var url = util.format('%s%s/%s/%s/%s/migratedb', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME);
  console.log(url);
  var params = {
    url: url,
    headers:{
      'x-fh-service-key': 'testkey'
    },
    json:{
    }
  };
  request.post(params, function(err, response){
    assert.equal(response.statusCode, 400);

    params.json.cacheKey = 'testcachekey';
    params.json.appGuid = 'testappguid';

    request.post(params, function(err, response, body){
      assert.equal(response.statusCode, 200);

      //request the same url again, we should get 423
      request.post(params, function(err, response){
        assert.equal(response.statusCode, 423);
        
        params.url = util.format('%s%s/%s/%s/%s/migrateComplete', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME);
        request.post(params, function(err, response){
          assert.equal(response.statusCode, 200);
          
          params.url = util.format('%s%s/%s/%s/%s/db', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME);
          request.del(params, function(err, response){
            assert.equal(response.statusCode, 200);
            finish();
          });
        });
      });
    });
  });
}