var assert = require('assert');
var proxyquire = require('proxyquire');
var util = require('util');
var sinon = require('sinon');

var undertest = '../../../../lib/handlers/analytics/messaging';

var mockMessageClient = {
  createAppMessage:function(topic,messages,cb){
    assert.ok(Array.isArray(messages));
    var lastId;
    messages.forEach(function (m){
      if(lastId) {
        assert.ok(m.guid === lastId,"expected all id to be the same");
      }
      else{
        lastId = m.guid;
      }
    });
    
    return cb();
  }
};

exports.test_create_app_message_fail = function(finish){
  var handler = proxyquire(undertest,{});
  var req = {"body":{},"params":{}};
  var res = {};
  res.end = sinon.stub();

  handler(mockMessageClient).createAppMessage(req,res, function (err){
    assert.ok(err, "expected an error " + util.inspect(err));
    return finish();
  });
  
};


exports.test_create_app_message_ok = function(finish){
  var handler = proxyquire(undertest,{});
  var req = {"body":[{"guid":"testid"},{"guid":"notmeid"},{"guid":"testid"}],"params":{"topic":"fhact","appid":"testid"}};
  var res = {};
  res.end = sinon.stub();

  handler(mockMessageClient).createAppMessage(req,res, function (err){
    assert.ok(! err, "did not expect an error " + util.inspect(err));
    
  });
  assert.ok(res.end.called,"expected end to be called");
  finish();
};