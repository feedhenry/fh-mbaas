var assert = require('assert');
var proxyquire = require('proxyquire').noCallThru();
var request = require('supertest');
var express = require('express');

exports.test_health_checks_ok_should_return_http_ok = function(finish){
  var testResults = {status: 'ok', summary: '', details: []};
  sendAndAssertHealthCheckRequest(testResults, 200, finish);
};

exports.test_health_checks_crit_should_return_http_internal_server_error = function(finish){
  var testResults = {status: 'crit', summary: '', details: []};
  sendAndAssertHealthCheckRequest(testResults, 500, finish);
};

exports.test_health_checks_warn_should_return_http_internal_server_error = function(finish){
  var testResults = {status: 'warn', summary: '', details: []};
  sendAndAssertHealthCheckRequest(testResults, 500, finish);
};

function sendAndAssertHealthCheckRequest(testResults, statusCode, finish) {
  request(healthMonitorApp(testResults))
    .get('/health')
    .end(function(err, res) {
      assert.ok(res.statusCode === statusCode, "Response status should have been " + statusCode);
      finish();
    });
}

function healthMonitorApp(testResults) {
  var healthMonitor = proxyquire('../../../lib/handlers/healthmonitor.js', {"fh-config": fhconfig(),
    "../util/ditchhelper.js": {},
    'fh-health': {
      init: function() {},
      addCriticalTest: function() {},
      runTests: function(cb) {
        cb(null, JSON.stringify(testResults));
      },
      setMaxRuntime: function() {}
    }
  });
  var app = express();
  app.use('/health', healthMonitor());
  return app;
}

function fhconfig() {
  var fhconfig = require('fh-config');
  fhconfig.setRawConfig(__dirname + '/../../../config/dev.json');
  return fhconfig;
}
