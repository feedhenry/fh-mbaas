var express = require('express');
var logger = require('../../util/logger').getLogger();
var auth = require('../../middleware/auth');
var fhconfig = require('fh-config');
var callStats = require('./stats_client');

var router = express.Router({
  mergeParams: true
});

router.use(auth.admin(fhconfig));

router.post(['/', '/history'], function(req, res) {
  logger.trace('stats', req.body);

  callStats(req.body, function(err, statsRes) {
    if (err) {
      return res.status(500).json(err);
    }

    return res.json(statsRes);
  });
});

module.exports = router;
