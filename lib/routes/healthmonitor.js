var express = require('express');
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var fhhealth = require('fh-health');
var MongoClient = require('mongodb').MongoClient;
var ditchHelper = require('../util/ditchhelper.js');
var util = require('util');
fhhealth.init();

function checkMongoDB(callback){
  MongoClient.connect(fhconfig.mongoConnectionString(), function(err, db){
    if(db && db.close && typeof db.close === 'function'){
      db.close();
    }
    if(err){
      logger.error({err: err}, 'health check error: can not connect to mongodb');
      return callback('can not connect to mongodb. Error: ' + util.inspect(err));
    }
    return callback(null, 'mongodb connection is ok');
  });
}

function checkDitch(callback){
  ditchHelper.checkStatus(function(err, ditchStatus){
    if(err){
      return callback('Error when checking fh-ditch status. Error: ' + util.inspect(err));
    }
    if(ditchStatus.statusCode && ditchStatus.statusCode !== 200){
      return callback('fh-ditch status check returns error. Details: ' + JSON.stringify(ditchStatus));
    }
    return callback(null, ditchStatus.message);
  });
}


function healthMonitorRoutes(){
  var router = new express.Router();
  fhhealth.addCriticalTest('Check Mongodb connection', checkMongoDB);
  fhhealth.addCriticalTest('Check fh-ditch status', checkDitch);
  router.get('/', function(req, res){
    fhhealth.runTests(function(err, testResults){
      res.end(testResults);
    });
  });

  return router;
}

module.exports = healthMonitorRoutes;
