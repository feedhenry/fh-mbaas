"use strict";

var proxyquire = require('proxyquire');
var assert = require('assert');

var ISODate = function (t) {
  return new Date(t);
};
var Timestamp = function (t) {
  return new Date(t);
};

var mockNoReplicaSet = {"ok": 0, "errmsg": "not running with --replSet"};

var mockReplicaSet = {
  "set": "eng1-mbaas1_rs1",
  "date": ISODate("2016-05-26T07:08:47Z"),
  "myState": 2,
  "syncingTo": "eng1-mbaas1-ship2:27017",
  "members": [
    {
      "_id": 0,
      "name": "eng1-mbaas1-mgt1:27017",
      "health": 0,
      "state": 8,
      "stateStr": "(not reachable/healthy)",
      "uptime": 0,
      "optime": Timestamp(1464095884, 1),
      "optimeDate": ISODate("2016-05-24T13:18:04Z"),
      "lastHeartbeat": ISODate("2016-05-26T07:08:47Z"),
      "lastHeartbeatRecv": ISODate("2016-05-24T13:18:06Z"),
      "pingMs": 0
    },
    {
      "_id": 1,
      "name": "eng1-mbaas1-ship1:27017",
      "health": 1,
      "state": 2,
      "stateStr": "SECONDARY",
      "uptime": 596220,
      "optime": Timestamp(1464246524, 1),
      "optimeDate": ISODate("2016-05-26T07:08:44Z"),
      "self": true
    },
    {
      "_id": 2,
      "name": "eng1-mbaas1-ship2:27017",
      "health": 1,
      "state": 1,
      "stateStr": "PRIMARY",
      "uptime": 92637,
      "optime": Timestamp(1464246524, 1),
      "optimeDate": ISODate("2016-05-26T07:08:44Z"),
      "lastHeartbeat": ISODate("2016-05-26T07:08:45Z"),
      "lastHeartbeatRecv": ISODate("2016-05-26T07:08:46Z"),
      "pingMs": 9,
      "syncingTo": "eng1-mbaas1-mgt1:27017"
    }
  ],
  "ok": 1
};

var mockMongo = null;

var mockChildProcess = {
  exec: function (command, cb) {
    var parts = command.split('--eval');

    assert.ok(parts.length > 0);

    var command = parts[1];

    // Need to remove the quotes from the command
    command = command.substring(0, command.length - 1);
    command = command.substring(2);

    // Simulates the command that is executed in mongodb
    function evalInContext() {
      try {
        return eval(command);
      } catch(err) {
        return null;
      }
    }

    var host = evalInContext.call(mockMongo);
    cb(null, host);
  }
};

var getHost = proxyquire('../../../lib/export/appDataExport', {
  "child_process": mockChildProcess
}).getSecondaryReplSetHost;

// Make sure that it finds the secondary replica set in a setup that
// has replica sets
module.exports.test_get_host_happy = function (done) {
  mockMongo = {
    rs: {
      status: function () {
        return mockReplicaSet;
      }
    }
  };

  getHost(function (err, host) {
    assert.equal(err, null);
    assert.equal(host, "eng1-mbaas1-ship1:27017");
    done();
  });
};

// Make sure that it returns null in a setup that does not have
// replica sets
module.exports.test_get_host_no_repl_set = function (done) {
  mockMongo = {
    rs: {
      status: function () {
        return mockNoReplicaSet;
      }
    }
  };

  getHost(function (err, host) {
    assert.equal(err, null);
    assert.equal(host, null);
    done();
  });
};
