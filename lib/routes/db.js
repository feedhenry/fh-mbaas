/**
 * DB API
 */

var express = require('express');
var util = require('util');
var router = new express.Router();
var logger = require('../util/logger.js').getLogger();
var config = require('../util/config.js').getConfig();
var _ = require('underscore');
var bodyParser = require('body-parser');
var cors = require('cors');

function dbRoutes(mbaas) {
  var router = new express.Router();
  var models = mbaas.models;

  router.get('/', function(req, res, next) {
    console.log(models);
    res.json({
      "hello": "world"
    });
  });

  return router;
}

module.exports = dbRoutes;