var supertest = require('supertest');
var proxyquire = require('proxyquire');
var fixtures = require('../../../fixtures');
var stubs = require('../../../stubs');
var express = require('express');
var assert = require('assert');
var util = require('util');
var fhConfig = require('fh-config');
fhConfig.setRawConfig(fixtures.config);
var logger = fhConfig.getLogger();
var sinon = require('sinon');
var bodyParser = require('body-parser');
var _ = require('underscore');

var baseRoutePath = '/:domain/:environment/services';
var baseUrl = '/' + fixtures.mockDomain + '/' + fixtures.mockEnv + '/services';

function createMocks(mockServiceModel){
  return {
    'fh-service-auth': {
      '@global': true,
      model: {
        get: mockServiceModel
      }
    },
    'fh-config': {
      '@global': true,
      getLogger: sinon.stub().returns(logger)
    },
    'fh-mbaas-middleware': {
      '@global': true,
      envMongoDb: {
        getOrCreateEnvironmentDatabase: sinon.stub().callsArg(2)
      }
    }
  };
}

module.exports = {
  "It Should List Services": function(done){
    var mockService = fixtures.services.get();
    var find = stubs.fhServiceAuth.model.find();
    var mockServiceModel = stubs.fhServiceAuth.model.get({
      find: find
    });

    var servicesRouter = proxyquire('../../../../lib/routes/services/router.js', createMocks(mockServiceModel));

    var app = express();

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, servicesRouter);

    supertest(app)
      .get(baseUrl + '/')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body[0].guid, mockService.guid);
      })
      .end(function (err) {
        if(err){
          console.error(err);
        }
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, mockServiceModel.callCount);
        assert.equal(1, find.callCount);

        done();
      });
  },
  "It Should Remove Services": function(done){
    var mockService = fixtures.services.get();
    var remove = stubs.fhServiceAuth.model.remove();
    var findOne = stubs.fhServiceAuth.model.findOne({
      remove: remove
    });
    var mockServiceModel = stubs.fhServiceAuth.model.get({
      findOne: findOne
    });

    var servicesRouter = proxyquire('../../../../lib/routes/services/router.js', createMocks(mockServiceModel));

    var app = express();

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, servicesRouter);

    supertest(app)
      .delete(baseUrl + '/' + mockService.guid)
      .expect(204)
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, mockServiceModel.callCount);
        assert.equal(1, findOne.callCount);
        assert.equal(1, remove.callCount);

        done();
      });
  },
  "It Should Get A Single Service": function(done){
    var mockService = fixtures.services.get();
    var findOne = stubs.fhServiceAuth.model.findOne();
    var mockSericeModel = stubs.fhServiceAuth.model.get({
      findOne: findOne
    });


    var servicesRouter = proxyquire('../../../../lib/routes/services/router.js', createMocks(mockSericeModel));

    var app = express();

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, servicesRouter);

    supertest(app)
      .get(baseUrl + '/' + mockService.guid)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body.guid, mockService.guid);
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, mockSericeModel.callCount);
        assert.equal(1, findOne.callCount);

        done();
      });
  },
  "It Should Deploy A Service": function(done){
    var mockDs = fixtures.forms.dataSources.get();
    var mockService = fixtures.services.get();
    var save = stubs.fhServiceAuth.model.save();
    var findOneOrCreate = stubs.fhServiceAuth.model.findOneOrCreate({
      save: save
    });
    var mockSericeModel = stubs.fhServiceAuth.model.get({
      findOneOrCreate: findOneOrCreate
    });

    var servicesRouter = proxyquire('../../../../lib/routes/services/router.js', createMocks(mockSericeModel));

    var app = express();

    app.use(bodyParser.json());

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, servicesRouter);

    supertest(app)
      .post(baseUrl + '/' + mockService.guid + "/deploy")
      .send(_.extend(mockService, {dataSources: [mockDs._id]}))
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body.guid, mockService.guid);
        assert.ok(res.body.dataSources);
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, mockSericeModel.callCount);
        assert.equal(1, findOneOrCreate.callCount);
        assert.equal(1, save.callCount);

        done();
      });
  }
};

