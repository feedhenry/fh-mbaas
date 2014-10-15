var express = require('express');
var cors = require('cors');
var common = require('../util/common.js');

function sysRoute() {
  var sys = new express.Router();
  sys.use(cors());

  sys.get('/info/ping', function(req, res) {
    res.end("'OK'");
  });


  sys.get('/info/version', function(req, res) {
    common.getVersion(function(err, version) {
      if (err) return common.handleError(err, 'Error getting version', 500, req, res);
      // TODO logger.info({req: req, version: version}, 'sys/info/version');

      common.setResponseHeaders(res);
      res.end(JSON.stringify(version));
    });
  });

  return sys;
}

module.exports = sysRoute;