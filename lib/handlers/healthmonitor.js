var express = require('express');
var fhconfig = require('fh-config');
var logger = require('../util/logger').getLogger();
var MongoClient = require('mongodb').MongoClient;
var request = require('request');
var ditchHelper = require('../util/ditchhelper.js');
var util = require('util');

function result(id, status, error) {
  return {
    id: id,
    status: status,
    error: error
  };
}

function checkMongoDB(callback) {
  MongoClient.connect(fhconfig.mongoConnectionString(), function(err, db) {
    if (db && db.close && typeof db.close === 'function') {
      db.close();
    }

    if (err) {
      logger.error({err: err}, 'health check error: can not connect to mongodb');
      return callback(result('mongodb', 'error', util.inspect(err)));
    }
    return callback(null, result('mongodb', 'OK', null));
  });
}

function checkDitch(callback) {
  ditchHelper.checkStatus(function(err, ditchStatus) {

    if (err) {
      return callback(result('fh-ditch', 'error', util.inspect(err)));
    }

    if (ditchStatus.statusCode && ditchStatus.statusCode !== 200) {
      return callback(result('fh-ditch', 'error', JSON.stringify(ditchStatus)));
    }
    return callback(null, result('fh-ditch', 'OK', null));
  });
}

function checkHttpService(name, url) {
  return function(callback) {
    request.get(url, function(err) {
      if (err) {
        return callback(result(name, 'error', util.inspect(err)));
      }
      return callback(null, result(name, 'OK', null));
    });
  };
}

function initFhHealth() {
  var fhhealth = require('fh-health');
  fhhealth.init();
  fhhealth.setMaxRuntime(10000);

  function constructHealthUrl(host, port, part) {
    return 'http://' + host + ':' + port + '/sys/info/' + part;
  }

  var statsdUrl = constructHealthUrl(fhconfig.value('fhstats.host'),
                                     fhconfig.value('fhstats.port'), 'ping');
  var metricsUrl = constructHealthUrl(fhconfig.value('fhmetrics.host'),
                                      fhconfig.value('fhmetrics.port'), 'health');
  var messagingUrl = constructHealthUrl(fhconfig.value('fhmessaging.host'),
                                        fhconfig.value('fhmessaging.port'), 'health');

  var checkFhStats = checkHttpService('fh-statsd', statsdUrl);
  var checkFhMetrics = checkHttpService('fh-metrics', metricsUrl);
  var checkFhMessaging = checkHttpService('fh-messaging', messagingUrl);

  fhhealth.addCriticalTest('Check Mongodb connection', checkMongoDB);

  if (fhconfig.value('openshift3')) {
    fhhealth.addCriticalTest('Check fh-statsd running', checkFhStats);
    fhhealth.addCriticalTest('Check fh-metrics running', checkFhMetrics);
    fhhealth.addCriticalTest('Check fh-messaging running', checkFhMessaging);
  } else {
    fhhealth.addCriticalTest('Check fh-ditch status', checkDitch);
  }

  return fhhealth;
}

function healthMonitorRoutes() {
  var fhhealth = initFhHealth();
  var router = new express.Router();
  router.get('/', function(req, res) {
    fhhealth.runTests(function(err, testResults) {
      var jsonResults = testResults ? JSON.parse(testResults) : null;
      if (err || !jsonResults || jsonResults.status !== 'ok') {
        res.status(500);
      }
      res.end(testResults);
    });
  });

  return router;
}

module.exports = healthMonitorRoutes;
