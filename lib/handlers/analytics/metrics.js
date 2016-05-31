/**
 * handles retrieving metrics from the fh-metrics component in the mbaas.
 */


var fhconfig = require('fh-config');
var metricsConfig = fhconfig.getConfig().rawConfig.fhmetrics;
var fhMetricsClient = require('fh-metrics-client')(metricsConfig);
var _ = require('underscore');
var async = require('async');

module.exports = {
  "getMetrics": function metrics(req,res,next) {
    if (! req.query.from || ! req.query.to) {
      return next({"code":400,message: "expected a to and from query param "});
    }

    var params = {
      "from":req.query.from,
      "to":req.query.to
    };

    async.parallel([
      function getDomain(callback) {
        fhMetricsClient.getAllDomainMetrics(params, function(err, ok) {
          callback(err,ok);
        });
      },
      function getApp(callback) {
        fhMetricsClient.getAllAppMetrics(params, function(err,ok) {
          callback(err,ok);
        });
      }
    ], function done(err, ok) {
      if (err) {
        return next(err);
      }
      res.metrics = _.extend(ok[0],ok[1]);
      next(undefined,res.metrics);
    });


  }
};
