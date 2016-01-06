var express = require('express');
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var MongoClient = require('mongodb').MongoClient;
var request = require('request');
var ditchHelper = require('../util/ditchhelper.js');
var redis = require('redis');

var util = require('util');

function checkMongoDB(callback) {
  MongoClient.connect(fhconfig.mongoConnectionString(), function(err, db) {
    if (db && db.close && typeof db.close === 'function') {
      db.close();
    }
    if (err) {
      logger.error({err: err}, 'health check error: can not connect to mongodb');
      return callback('can not connect to mongodb. Error: ' + util.inspect(err));
    }
    return callback(null, 'mongodb connection is ok');
  });
}

function checkDitch (callback) {
  ditchHelper.checkStatus(function(err, ditchStatus) {
    if (err) {
      return callback('Error when checking fh-ditch status. Error: ' + util.inspect(err));
    }
    if (ditchStatus.statusCode && ditchStatus.statusCode !== 200) {
      return callback('fh-ditch status check returns error. Details: ' + JSON.stringify(ditchStatus));
    }
    return callback(null, ditchStatus.message);
  });
}

function checkRedis(callback) {
  var client = redis.createClient(fhconfig.value('fhredis.port'),
                                  fhconfig.value('fhredis.host'));

  client.on('error', function(err) {
    client.quit();
    return callback('redis is not running. Error:' + util.inspect(err));
  });

  client.on('ready', function() {
    client.quit();
    return callback(null, 'redis connection is ok');
  });
}

function checkHttpService(name, url) {
  return function(callback) {
    request.get(url, function(err, res, body) {
      if (err) {
        return callback('Error: ' + util.inspect(err));
      }
      return callback(null, name + ' is ok');
    });
  };
}

function initFhHealth() {
  var fhhealth = require('fh-health');
  fhhealth.init();

  function constructHealthUrl(host, port) {
    return 'http://' + host + ':' + port + '/sys/info/ping/';
  }

  var statsdUrl = constructHealthUrl(fhconfig.value('fhstats.host'),
                                     fhconfig.value('fhstats.port'));
  var metricsUrl = constructHealthUrl(fhconfig.value('fhmetrics.host'),
                                      fhconfig.value('fhmetrics.port'));
  var messagingUrl = constructHealthUrl(fhconfig.value('fhmessaging.host'),
                                        fhconfig.value('fhmessaging.port'));

  var checkFhStats = checkHttpService('fh-statsd', statsdUrl);
  var checkFhMetrics = checkHttpService('fh-metrics', metricsUrl);
  var checkFhMessaging = checkHttpService('fh-messaging', messagingUrl);

  fhhealth.addCriticalTest('Check Mongodb connection', checkMongoDB);

  if (fhconfig.value('openshift3')) {
    fhhealth.addCriticalTest('Check Redis connection', checkRedis);
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
      res.end(testResults);
    });
  });

  return router;
}

module.exports = healthMonitorRoutes;
