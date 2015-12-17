var request = require("request");
var util = require('util');
var assert = require('assert');
var common = require('./common');
var url = require('url');
var _ = require('underscore');
var express = require('express');
var fhMiddleWare = require('fh-mbaas-middleware');
var supertest = require('supertest');
var proxyquire = require('proxyquire');
var cors = require('cors');
var bodyParser = require('body-parser');


var TEST_DOMAIN = 'fhmbaas-accept-test-domain';
var TEST_ENV = 'test';
var TEST_APP_NAME= "pe4g7d7nx2if5jhbjeiwh6bl";
var TEST_API_KEY="somekey";
var TEST_CORE_HOST="testing";


var mbaasApp;

exports.setUp = function (finish){
  var req = {"body":{"appGuid":TEST_APP_NAME, "apiKey":TEST_API_KEY, "coreHost":TEST_CORE_HOST,"mbaasUrl":"mbaas.test.me","type":"feedhenry"},"params":{"domain":TEST_DOMAIN,"environment":TEST_ENV,"appname":TEST_APP_NAME}};
  
  fhMiddleWare.app.findOrCreateMbaasApp(req,{},function (err){
    assert.ok(!err,"did not expect an error setting up " , err);
    mbaasApp = req.appMbaasModel;
    finish();  
  });
  
};


function defineRoute(mocks){
  var app= new express();
  
  var testRoute = proxyquire('../../lib/handlers/app',mocks || {});
  app.use(cors());

  // Parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({
    extended: false
  }));

  // Parse JSON payloads
  app.use(bodyParser.json({limit: "20mb"}));
  app.use(testRoute);
  
  return app;
}

function getMessage(){
  return {
    guid:TEST_APP_NAME,
    appid:TEST_APP_NAME,
    domain:TEST_DOMAIN,
    bytes:10,
    cached:false,
    cuid:  "",
    destination:"",
    agent: "",
    'function': "",
    ipAddress:"192.168.33.10",
    scriptEngine:"node",
    'status': "",
    time: 0,
    startTime : new Date().getTime(),
    endTime : new Date().getTime(),
    'version': 0
  };
}

exports.it_should_fail_with_401 = function (finish){
  var app = defineRoute();
  supertest(app)
    .post("/"+TEST_DOMAIN + "/" + TEST_ENV + "/"+TEST_APP_NAME+"/" + TEST_APP_NAME + "/message/fhact")
    .set("Content-Type","application/json")
    .expect(401)
    .end(function(err, res){
      assert.ok(!err," did not expect an error " + util.inspect(err));
      finish();
    });
};

exports.it_should_complete_ok_with_single_message = function (finish){
  var app = defineRoute({
    'fh-messaging-client':function (config){
      return {
        "createAppMessage": function (topic,msg,callback) {
          assert.ok(topic === "fhact","expected the topic to be fhact");
          callback();
        }
      }
    }
  });
  supertest(app)
    .post("/"+TEST_DOMAIN + "/" + TEST_ENV + "/"+TEST_APP_NAME+"/" + TEST_APP_NAME + "/message/fhact")
    .set("Content-Type","application/json")
    .set("x-fh-env-access-key",mbaasApp.accessKey)
    .set("x-fh-auth-app",TEST_API_KEY)
    .send(getMessage())
    .expect(201)
    .end(function(err, res){
      assert.ok(!err," did not expect an error " + util.inspect(err));
      finish();
    });
};


exports.it_should_complete_ok_with_array_of_messages = function (finish){
  var app = defineRoute({
    'fh-messaging-client':function (config){
      return {
        "createAppMessage": function (topic,msg,callback) {
          assert.ok(topic === "fhact","expected the topic to be fhact");
          callback();
        }
      }
    }
  });
  supertest(app)
    .post("/"+TEST_DOMAIN + "/" + TEST_ENV + "/"+TEST_APP_NAME+"/" + TEST_APP_NAME + "/message/fhact")
    .set("Content-Type","application/json")
    .set("x-fh-env-access-key",mbaasApp.accessKey)
    .set("x-fh-auth-app",TEST_API_KEY)
    .send([getMessage(),getMessage()])
    .expect(201)
    .end(function(err, res){
      assert.ok(!err," did not expect an error " + util.inspect(err));
      finish();
    });
};

exports.it_should_complete_ok_even_error_with_client = function (finish){
  var app = defineRoute({
    'fh-messaging-client':function (config){
      return {
        "createAppMessage": function (topic,msg,callback) {
          
          callback({"error":"someerror"});
        }
      }
    }
  });
  supertest(app)
    .post("/"+TEST_DOMAIN + "/" + TEST_ENV + "/"+TEST_APP_NAME+"/" + TEST_APP_NAME + "/message/fhact")
    .set("Content-Type","application/json")
    .set("x-fh-env-access-key",mbaasApp.accessKey)
    .set("x-fh-auth-app",TEST_API_KEY)
    .send([getMessage(),getMessage()])
    .expect(201)
    .end(function(err, res){
      assert.ok(!err," did not expect an error " + util.inspect(err));
      finish();
    });
};


