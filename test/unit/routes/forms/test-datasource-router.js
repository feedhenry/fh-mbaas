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

var baseRoutePath = '/:domain/:environment/appforms/data_sources';
var baseUrl = '/' + fixtures.mockDomain + '/' + fixtures.mockEnv + '/appforms/data_sources';

module.exports = {
  "It Should List Data Sources": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var dsListStub = stubs.forms.core.dataSources.list();

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            list: dsListStub
          }
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .get(baseUrl + '/')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body[0]._id, mockDs._id);
        assert.equal(res.body[0].serviceGuid, mockServiceDetails.guid);
      })
      .end(function (err) {
        if(err){
          console.error(err);
        }
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, dsListStub.callCount);

        done();
      });
  },
  "It Should Get A Single Data Source": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var dsGetStub = stubs.forms.core.dataSources.get();

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            get: dsGetStub
          }
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .get(baseUrl + '/' + mockDs._id)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, dsGetStub.callCount);

        done();
      });
  },
  "It Should Deploy A Single Data Source": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var deploy = stubs.forms.core.dataSources.deploy();
    var mockUpdateDataSources = stubs.fhServiceAuth.model.updateDataSources();
    var mockServiceModel = stubs.fhServiceAuth.model.get({
      updateDataSources: mockUpdateDataSources
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            deploy: deploy
          }
        }
      },
      'fh-service-auth': {
        '@global': true,
        model: {
          get: mockServiceModel
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(bodyParser.json());

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .post(baseUrl + '/' + mockDs._id + "/deploy")
      .send(mockDs)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + err);

        assert.equal(1, deploy.callCount);
        assert.equal(1, mockUpdateDataSources.callCount);
        assert.equal(1, mockServiceModel.callCount);

        done();
      });
  },
  "It Should Remove A Single Data Source": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var dsRemoveStub = stubs.forms.core.dataSources.remove();
    var dsGetStub = stubs.forms.core.dataSources.get();
    var mockRemoveDSStub = stubs.fhServiceAuth.model.removeDataSource();
    var mockSericeModel = stubs.fhServiceAuth.model.get({
      removeDataSource: mockRemoveDSStub
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            remove: dsRemoveStub,
            get: dsGetStub
          }
        }
      },
      'fh-service-auth': {
        '@global': true,
        model: {
          get: mockSericeModel
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function(req, res, next){
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .delete(baseUrl + '/' + mockDs._id)
      .expect(204)
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, dsRemoveStub.callCount);
        assert.equal(1, mockSericeModel.callCount);
        assert.equal(1, mockRemoveDSStub.callCount);
        assert.equal(1, dsGetStub.callCount);

        done();
      });
  }
};