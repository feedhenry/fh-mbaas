var request = require("request");
var util = require('util');
var assert = require('assert');
var common = require('./common');
var MongoClient = require('mongodb').MongoClient;
var url = require('url');
var _ = require('underscore');

var TEST_DOMAIN = 'fhmbaas-accept-test-domain';
var TEST_ENV = 'test';

var mockRequestData = {
  securityToken: 'securityToken',
  appGuid: 'testappguid',
  coreHost: 'some.core.host.com',
  apiKey: "someappapikey",
  type: "feedhenry",
  mbaasUrl: "https://mbaas.somembaas.com",
  url: "https://some.cloud.app.url"
};


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
    assert.ok(!err, 'db create request should success ' + err);
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

var TEST_APP_NAME = 'fhmbaas-accept-test-appnames'+new Date().getTime();
exports.it_should_migrate_db = function(finish){
  var url = util.format('%s%s/%s/%s/%s/migratedb', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME);
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
    _.extend(params.json, mockRequestData);
    request.post(params, function(err, response){
      console.log("RESPONSE" + JSON.stringify(response));
      assert.equal(response.statusCode, 200);

      finish();
    });
  });
};

exports.it_should_return_app_envs = function(finish){
  var url = util.format('%s%s/%s/%s/db', common.baseUrl, 'api/mbaas', TEST_DOMAIN, TEST_ENV + '_appenvtest');
  var params = {
    url: url,
    headers:{
      'x-fh-service-key': 'testkey'
    },
    json:{}
  };
  var appMigrateDbUrl = util.format('%s%s/%s/%s/%s/migratedb', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME + '_app_envtest');
  params.url = appMigrateDbUrl;

  _.extend(params.json, mockRequestData);

  request.post(params, function(err, response){
    assert.ok(!err);
    assert.equal(200, response.statusCode);

    var appEnvUrl = util.format('%s%s/%s/%s/%s/env', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME + '_app_envtest');
    request.get({
      url: appEnvUrl,
      headers:{
        'x-fh-service-key': 'testkey'
      }
    }, function(err, response, body){
      assert.ok(!err);
      assert.equal(200, response.statusCode);

      finish();
    });
  });
};

/**
 * Testing that a deploy call to mbaas will store app specific information
 * @param finish
 */
exports.it_should_deploy_app_to_env = function(finish){
  var mbaasUrl = util.format('%s%s/%s/%s/db', common.baseUrl, 'api/mbaas', TEST_DOMAIN, TEST_ENV + '_appenvtest');
  var params = {
    url: mbaasUrl,
    headers:{
      'x-fh-service-key': 'testkey'
    },
    json: {},
    body: {}
  };
  params.url = util.format('%s%s/%s/%s/%s/deploy', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME + '_app_deploytest');
  _.extend(params.json, mockRequestData);

  request.post(params, function(err, response){
    assert.ok(!err);
    assert.equal(200, response.statusCode);

    var appEnvUrl = util.format('%s%s/%s/%s/%s/env', common.baseUrl, 'api/mbaas/apps', TEST_DOMAIN, TEST_ENV, TEST_APP_NAME + '_app_deploytest');
    request.get({
      url: appEnvUrl,
      headers:{
        'x-fh-service-key': 'testkey'
      },
      json: true
    }, function(err, response, body){
      assert.ok(!err);
      assert.equal(200, response.statusCode);

      assert.ok(body.env.FH_MBAAS_ENV_ACCESS_KEY.length === 24, "Expected A Valid Access Key");
      assert.equal(body.env.FH_MBAAS_HOST, url.parse(mockRequestData.mbaasUrl).host);
      assert.equal(body.env.FH_MBAAS_PROTOCOL, "https");

      var firstAccessKey = body.env.FH_MBAAS_ENV_ACCESS_KEY;

      params.body.coreHost = "some.other.core.host.com";

      //Calling deploy again should not modify the access key

      request.post(params, function(err, response){
        assert.ok(!err, "Unexpected Error");
        assert.equal(200, response.statusCode);

        request.get({
          url: appEnvUrl,
          headers:{
            'x-fh-service-key': 'testkey'
          },
          json: true
        }, function(err, response, body){
          assert.ok(!err, "Unexpected Error");
          assert.equal(firstAccessKey, body.env.FH_MBAAS_ENV_ACCESS_KEY);

          finish();
        });
      });
    });
  });
};
