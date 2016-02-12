var assert = require('assert');
var proxyquire = require('proxyquire');
var util = require('util');


var undertest = '../../../../lib/handlers/analytics/metrics';

var domRes = {"domaininstallsgeo":[],"domainrequestsdest":[{"_id":{"domain":"testing","ts":1444694400000},"value":{"other":25,"total":25}}],"domainrequestsgeo":[],"domainstartupsdest":[],"domainstartupsgeo":[],"domaintransactionsdest":[{"_id":{"domain":"testing","ts":1444694400000},"value":{"other":2,"total":2}}],"domaintransactionsgeo":[],"domaininstallsdest":[]}
var appRes = {"appinstallsgeo":[],"apprequestsdest":[{"_id":{"appid":"pe4g7d26q6wet742ak7wbgp5","domain":"testing","ts":1444694400000},"value":{"other":8,"total":8}},{"_id":{"appid":"gyiaeopx26i3pl6ls5652ipc","domain":"testing","ts":1444694400000},"value":{"other":17,"total":17}}],"apprequestsgeo":[],"appstartupsdest":[],"appstartupsgeo":[],"apptransactionsdest":[{"_id":{"appid":"pe4g7d26q6wet742ak7wbgp5","domain":"testing","ts":1444694400000},"value":{"other":1}},{"_id":{"appid":"gyiaeopx26i3pl6ls5652ipc","domain":"testing","ts":1444694400000},"value":{"other":1}}],"appinstallsdest":[],"apptransactionsgeo":[]};

var fhmetricsMock = {
  getAllDomainMetrics : function (params,cb){
    return cb(undefined,domRes);    
  },
  getAllAppMetrics : function (params,cb){
    return cb(undefined,appRes);
  }
};

var fhmetricsMockError = {
  getAllDomainMetrics : function (params,cb){
    return cb({"error":"test error"});
  },
  getAllAppMetrics : function (params,cb){
    return cb({"error":"test error"});
  }
};



exports.test_get_mbaas_metrics_ok = function (finish){
  var mock = {
    'fh-metrics-client' : function (conf){
      return fhmetricsMock;
    }
  };
  
  var test = proxyquire(undertest,mock);
  var req = {"query":{"from": new Date().getTime(),"to":new Date().getTime()}};
  var res = {};
  test.getMetrics(req,res, function (err, ok){
    assert.ok(! err, "did not expect an err" + util.inspect(err));
    assert.ok(ok,"expected a response ");
    assert.ok(! Array.isArray(ok));
    assert.ok(res.metrics,"expected metrics on res");
    finish();
  });
  
};

exports.test_get_mbaas_metrics_error = function (finish){
  var mock = {
    'fh-metrics-client' : function (conf){
      return fhmetricsMockError;
    }
  };

  var test = proxyquire(undertest,mock);
  var req = {"query":{"from": new Date().getTime(),"to":new Date().getTime()}};
  var res = {};
  test.getMetrics(req,res, function (err, ok){
    assert.ok(err, " expected an err" + util.inspect(err));
    assert.ok(! ok," did not expected a response ");
    finish();
  });
};

exports.test_get_mbaas_metrics_400_error = function (finish){
  var mock = {
    'fh-metrics-client' : function (conf){
      return fhmetricsMockError;
    }
  };

  var test = proxyquire(undertest,mock);
  var req = {"query":{}};
  var res = {};
  test.getMetrics(req,res, function (err, ok){
    assert.ok(err, " expected an err" + util.inspect(err));
    assert.ok(err.code === 400, " expected a 400 err code " + util.inspect(err));
    finish();
  });
};
