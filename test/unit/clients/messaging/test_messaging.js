/*
 JBoss, Home of Professional Open Source
 Copyright Red Hat, Inc., and individual contributors.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var util = require('util');
var assert = require('assert');
var proxyquire = require('proxyquire');

var undertest = '../../../../lib/clients/messaging/index';

var mock = {
  'request': function (params,cb){
    cb(undefined,{"statusCode":200},{});
  }
};

var messagingConfig = {
  "host":"127.0.0.1",
  "port":"8813",
  "protocol":"http",
  "apikey":"somekey"
};


exports.test_messaging_config_ok = function (finish){
  try {
    proxyquire(undertest, {})(messagingConfig);
  }catch(e){
    assert.fail("did not expect an exception" + e.message);
  }
  finish();
};

exports.test_messaging_config_fail = function (finish){
  try {
    proxyquire(undertest, {})({"host":"host"});
  }catch(e){
    assert.ok(e,"expected an exception");
    return finish();
  }
  assert.fail("expected an exception");
};

exports.test_create_app_message_ok = function (finish){
  try {
    var client = proxyquire(undertest, mock)(messagingConfig);
    client.createAppMessage("fhact",{},function (err,body,status){
      assert.ok(! err , " did not expect an error " + util.inspect(err));
      assert.ok(200 === status);
      finish();    
    });
  }catch(e){
    assert.fail("did not expect an exception" + e.message);
  }
  
};

exports.test_create_app_message_status_code = function (finish){
  try {
    var mock = {
      'request': function (params,cb){
        cb(undefined,{"statusCode":400},{});
      }
    };
    var client = proxyquire(undertest, mock)(messagingConfig);
    client.createAppMessage("fhact",{},function (err,body,status){
      assert.ok(! err , " did not expect an error " + util.inspect(err));
      assert.ok(400 === status);
      finish();
    });
  }catch(e){
    assert.fail("did not expect an exception" + e.message);
  }
};