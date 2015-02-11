var common = require('lib/util/common.js');
var util = require('util');
var assert = require('assert');

exports.it_should_handle_error = function(finish) {
  var req = {
    id: 123
  };
  var res = {
    statusCode: 0,
    end: function(msg) {
      assert.equal(res.statusCode, 1, 'Expected statusCode of 1, got: ' + res.statusCode);
      assert.notEqual(msg.indexOf('ignore'), -1);
      finish();
    }
  };
  common.handleError('dummy error', 'ignore the dummy error', 1, req, res);
};

exports.it_should_get_ip_address_header = function(finish){
  var req = {
    "headers": {
      "x-forwarded-for" : "192.168.1.1"
    }
  }

  var testIPAddress = common.getIPAddress(req);
  assert.equal("192.168.1.1", testIPAddress);
  return finish();
};

exports.it_should_get_ip_address_connection = function(finish){
  var req = {
    "connection" : {
      "remoteAddress" : "192.168.1.2"
    }
  }

  var testIPAddress = common.getIPAddress(req);
  assert.strictEqual("192.168.1.2", testIPAddress);
  return finish();
};


exports.it_should_get_version = function(finish) {
  common.getVersion(function(err, version) {
    assert.ok(!err, 'Error: ' + util.inspect(err));
    assert.ok(version);

    // call it twice to coverage pkg caching in common.js
    common.getVersion(function(err, version2) {
      assert.equal(version, version2);
      return finish();
    });
  });
};

exports.it_should_sort_objects = function(finish) {
  var accessBos = {
    'a.b.z': '789',
    'a': '123',
    'a.b': '456'
  };
  var sorted = common.sortObject(accessBos);
  assert.equal(sorted[0]['a'], accessBos['a']);
  assert.equal(sorted[2]['a.b.z'], accessBos['a.b.z']);

  // re-passing the sorted array should fail
  var gotException = false;
  try {
    sorted = common.sortObject(sorted);
  }catch(x) {
    gotException = true;
  }

  assert.ok(gotException, 'Expected assertion error when passing array');

  finish();
};

exports.it_should_get_random_password = function(finish){
  var pass = common.randomPassword();
  assert.ok(pass.length > 0);
  finish();
};
