var assert = require('assert');
var proxyquire = require('proxyquire');
var util = require('util');
var sinon = require('sinon');

var undertest = '../../../../lib/handlers/app/db.js';


module.exports.test_get_connection_string_ok = function (finish){
  var req = {"appMbaasModel":{
    "dbConf":{
      "host":"10.2.3.4,10.3.4.5,10.4.5.6",
      "pass":"test",
      "user":"test",
      "name":"test",
      "port":27017
    }
  }}, res = {};
  var next = sinon.spy(function (err){

  });

  var reload = sinon.spy(function (workers,callback){
    return callback();
  });

  var value = sinon.spy(function (val){
    return  "10.5.4.3,10.5.4.3,10.5.4.3"
  });

  var db = proxyquire(undertest,{
    "fh-config":{
      "reload":reload,
      "value":value
    }
  });

  db.getConnectionString(req,res,next);
  assert(next.calledOnce,"expected next to be called once");
  assert(req.resultData, "expected result data");
  assert.ok(req.resultData.url,"expected a url value");
  assert.ok(req.resultData.url.indexOf("mongodb") === 0,"expected a mongodb connection string");
  finish();

};

module.exports.test_get_connection_string_not_ok_without_dbconf = function (finish){
  var db = proxyquire(undertest,{});
  var req = {}, res = {};
  var next = sinon.spy(function (err){
    assert.ok(err, "expected an error to be returned");
    assert.ok(err.code === 404, "error code should be 404")
  });

  db.getConnectionString(req,res,next);
  assert(next.calledOnce,"expected next to be called one")
  finish();
};


module.exports.test_get_connection_string_not_ok_when_fhconfig_reload_fails = function (finish){

  var req = {"appMbaasModel":{
    "dbConf":{
      "host":"10.2.3.4,10.3.4.5,10.4.5.6",
      "pass":"test",
      "user":"test",
      "name":"test"
    }
  }}, res = {};
  var next = sinon.spy(function (err){
    assert.ok(err, "expected an error to be returned");
  });

  var reload = sinon.spy(function (workers,callback){
     return callback({"message":"failed to reload"});
  });

  var db = proxyquire(undertest,{
    "fh-config":{
      "reload":reload
    }
  });

  db.getConnectionString(req,res,next);
  assert(next.calledOnce,"expected next to be called once");
  finish();
};

module.exports.test_get_connection_string_userspace = function(finish) {
  process.env.MONGODB_USERDB_NAMESPACE = "something";
  var cfg = require("../../../fixtures/config");

  var req = {"appMbaasModel":{
    "dbConf":{
      "host":"10.2.3.4,10.3.4.5,10.4.5.6",
      "pass":"test",
      "user":"test",
      "name":"test"
    }
  }}, res = {};
  
  var next = sinon.spy(function (err){

  });

  var reload = sinon.spy(function (workers,callback){
    return callback();
  });

  var value = sinon.spy(function (val){
    var key = val.split('.')[1];
    return cfg.mongo_userdb[key];
  });

  var db = proxyquire(undertest,{
    "fh-config":{
      "reload":reload,
      "value":value
    }
  });

  db.getConnectionString(req,res,next);
  assert(next.calledOnce,"expected next to be called once");
  assert(req.resultData, "expected result data");
  assert.ok(req.resultData.url,"expected a url value");
  assert.ok(req.resultData.url.indexOf("mongodb") === 0,"expected a mongodb connection string");
  assert.ok(req.resultData.url.indexOf("userdb-localhost") !== -1,"expected userspace substring in mongodb connection string");
  delete process.env.MONGODB_USERDB_NAMESPACE;
  finish();
};
