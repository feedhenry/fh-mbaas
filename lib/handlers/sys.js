var express = require('express');
var cors = require('cors');
var common = require('../util/common.js');
var healthRoute = require('./healthmonitor.js');

function sysRoute() {
  var sys = new express.Router();
  sys.use(cors());

  sys.get('/info/ping', function(req, res) {
    res.end("'OK'");
  });


  sys.get('/info/version', function(req, res) {
    common.getVersion(function(err, version) {
      if (err) {
        return common.handleError(err, 'Error getting version', 500, req, res);
      }

      common.setResponseHeaders(res);
      res.end(JSON.stringify(version));
    });
  });

  sys.use('/info/health', healthRoute());

  return sys;
}

module.exports = sysRoute;
