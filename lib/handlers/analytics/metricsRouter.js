/**
 *
 * @type {*|exports|module.exports}
 *
 */

var express = require('express');
var auth = require('../../middleware/auth');
var metrics = require('./metrics');
var fhconfig = require('fh-config');

var router = express.Router({
  mergeParams: true
});

router.use(auth.admin(fhconfig));


router.get("/",metrics.getMetrics);

router.use(function analyticsErrorHandler(err, req, res, next) {
  if (err.code) {
    res.statusCode = err.code || 500;
  }
  res.json(err);
});

router.use(function(req,res) {
  if (res.metrics) {
    return res.json(res.metrics);
  } else {
    res.statusCode = 404;
    res.json({"message":"no route found"});
  }
});

module.exports = router;

