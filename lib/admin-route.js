var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var common = require('./util/common.js');
var logger = require('./util/logger.js').getLogger();

function adminRoute(mbaas) {
  var admin = new express.Router();
  admin.use(cors());
  admin.use(bodyParser());

  /////////////////////// Teams

  admin.get('/teams', function(req, res) {
    logger.trace({req: req}, 'Get Teams');
    res.json({error: 'not implemented'});
  });


  return admin;
}

module.exports = adminRoute;
