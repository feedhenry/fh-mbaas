var request = require("request");
var util = require('util');
var assert = require('assert');
var common = require('./common.js');

exports.it_should_test_sys_info_ping = function(finish){
  request(common.baseUrl + 'sys/info/ping', function(err, response, body){
    assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    assert.equal(response.statusCode, 200, 'Unexpected statusCode: ', response.statusCode + ' - ' + util.inspect(body));
    assert.equal(body, "'OK'");
    finish();
  });
};

exports.it_should_test_sys_info_versuib = function(finish){
  request(common.baseUrl + 'sys/info/version', function(err, response, body){
    assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    assert.equal(response.statusCode, 200, 'Unexpected statusCode: ', response.statusCode + ' - ' + util.inspect(body));
    assert.ok(body);
    finish();
  });
};

exports.it_should_test_sys_info_health = function(finish){
  request(common.baseUrl + 'sys/info/health', function (err, response, body) {
    assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    assert.equal(response.statusCode, 200, 'Unexpected statusCode: ', response.statusCode + ' - ' + util.inspect(body));
    assert.ok(body);
    finish();
  });
}
