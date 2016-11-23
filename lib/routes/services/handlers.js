var async = require('async');
var serviceServices = require('../../services/services');

/**
 * Handler For Listing Services
 * @param req
 * @param res
 * @param next
 */
function get(req, res, next) {
  async.waterfall([
    function(cb) {
      serviceServices.get({
        domain: req.params.domain,
        guid: req.params.guid,
        mongoUrl: req.mongoUrl
      }, cb);
    }
  ], function(err, result) {
    if (err) {
      return next(err);
    }

    res.json(result);
  });
}

/**
 * Handler For Listing Services
 * @param req
 * @param res
 * @param next
 */
function list(req, res, next) {
  async.waterfall([
    function(cb) {
      serviceServices.findServicesForDomain({
        domain: req.params.domain,
        mongoUrl: req.mongoUrl
      }, cb);
    }
  ], function(err, result) {
    if (err) {
      return next(err);
    }

    res.json(result);
  });
}

/**
 * Handler For Deploying A Service To The Mbaas
 * @param req
 * @param res
 * @param next
 */
function deploy(req, res, next) {
  async.waterfall([
    function(cb) {
      serviceServices.deploy({
        mongoUrl: req.mongoUrl,
        domain: req.params.domain,
        service: req.body
      }, cb);
    }
  ], function(err, result) {
    if (err) {
      return next(err);
    }

    res.json(result);
  });
}

/**
 * Handler For Removing A Service
 * @param req
 * @param res
 * @param next
 */
function remove(req, res, next) {
  async.waterfall([
    function(cb) {
      serviceServices.remove({
        mongoUrl: req.mongoUrl,
        guid: req.params.guid,
        domain: req.params.domain
      }, cb);
    }
  ], function(err) {
    if (err) {
      return next(err);
    }

    res.status(204).end();
  });
}

module.exports = {
  get: get,
  list: list,
  deploy: deploy,
  remove: remove
};