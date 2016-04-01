var assert = require('assert');
var proxyquire = require('proxyquire');
var util = require('util');
var sinon = require('sinon');

var fixtures = require('../../../fixtures');
var fhConfig = require('fh-config');
var logger = fhConfig.getLogger();

var mockLogger = function() {
  return {
    debug: function() {},
    trace: function() {}
  }
};

var mockRes = {
  "interval": 10000,
  "results": [{
    "numStats": 6,
    "ts": 1459426396298,
    "counters": [],
    "timers": [],
    "gauges": []
  }, {
    "numStats": 6,
    "ts": 1459426406298,
    "counters": [],
    "timers": [],
    "gauges": []
  }]
};

exports.setUp = function(finish) {
  fhConfig.setRawConfig(fixtures.config);
  finish();
}

exports.test_call_stats = function(finish) {
  var statsClient = proxyquire('../../../../lib/handlers/stats/stats_client', {
    'fh-config': {
      getLogger: mockLogger
    },
    'request': {
      'post': function(params, cb) {
        assert.ok(params.headers['x-feedhenry-statsapikey'], 'Should send stats API key');
        return cb(null, {
          statusCode: 200
        }, mockRes);
      }
    }
  });

  statsClient({}, function(err, res) {
    assert.ok(!err, 'Error - no error should be received');
    assert.ok(res);
    return finish();
  });
}

exports.test_call_stats_error = function(finish) {
  var statsClient = proxyquire('../../../../lib/handlers/stats/stats_client', {
    'fh-config': {
      getLogger: mockLogger
    },
    'request': {
      'post': function(params, cb) {
        assert.ok(params.headers['x-feedhenry-statsapikey'], 'Should send stats API key');
        return cb(null, {
          statusCode: 500
        }, mockRes);
      }
    }
  });

  statsClient({}, function(err, res) {
    assert.ok(err, 'Error should be received');
    assert.ok(err.message, 'Failed to call stats: 500');
    assert.ok(!res, 'Res should be null');
    return finish();
  });
}