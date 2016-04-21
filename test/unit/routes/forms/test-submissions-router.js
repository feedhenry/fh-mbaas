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
var CONSTANTS = require('../../../../lib/constants');

describe("Admin Submissions Router", function(){
  var baseRoutePath = '/:domain/:environment/appforms/submissions';
  var baseUrl = '/' + fixtures.mockDomain + '/' + fixtures.mockEnv + '/appforms/submissions';

  var getMaxLimitValueStub = sinon.stub();
  getMaxLimitValueStub.withArgs(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_MAX_LIMIT_KEY).returns(fixtures.config.fhmbaas.pagination.maxLimit);
  getMaxLimitValueStub.withArgs(CONSTANTS.CONFIG_PROPERTIES.PAGINATION_DEFAULT_LIMIT_KEY).returns(fixtures.config.fhmbaas.pagination.defaultLimit);
  getMaxLimitValueStub.throws("Invalid Arguments");

  beforeEach(function(done){
    getMaxLimitValueStub.reset();
    done();
  });

  it("List Submissions", function(done){
    var expectedPage = 3;
    var expectedLimit = 20;
    var getSubmissionsStub = stubs.forms.core.getSubmissions({
      expectedPage: expectedPage,
      expectedLimit: expectedLimit
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          getSubmissions: getSubmissionsStub
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger),
        value: getMaxLimitValueStub
      }
    };

    var submissionsRouter = proxyquire('../../../../lib/routes/forms/submissions/router.js', mocks);

    fhConfig.setRawConfig(fixtures.config);

    var app = express();

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, submissionsRouter());

    supertest(app)
      .get(baseUrl + '/?page='+expectedPage + '&limit=' + expectedLimit)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (response) {
        assert.ok(_.isArray(response.body.submissions), "Expected an array of submisisons");
        assert.ok(_.isNumber(response.body.total), "Expected a number for total submissions");
        assert.ok(_.isNumber(response.body.pages), "Expected a number for total submissions");
      })
      .end(function (err, res) {
        if (err) {
          logger.error(err, res);
        }
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        sinon.assert.calledOnce(getSubmissionsStub);
        sinon.assert.calledWith(getMaxLimitValueStub, CONSTANTS.CONFIG_PROPERTIES.PAGINATION_MAX_LIMIT_KEY);
        sinon.assert.calledWith(getMaxLimitValueStub, CONSTANTS.CONFIG_PROPERTIES.PAGINATION_DEFAULT_LIMIT_KEY);

        done();
      });
  });

  it("Search Submissions", function(done){
    var expectedPage = 3;
    var expectedLimit = 20;
    var searchSubmissionsStub = stubs.forms.core.submissionSearch({
      expectedPage: expectedPage,
      expectedLimit: expectedLimit,
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          submissionSearch: searchSubmissionsStub
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger),
        value: getMaxLimitValueStub
      }
    };

    var submissionsRouter = proxyquire('../../../../lib/routes/forms/submissions/router.js', mocks);

    fhConfig.setRawConfig(fixtures.config);

    var app = express();

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, submissionsRouter());

    supertest(app)
      .post(baseUrl + '/search?page='+expectedPage + '&limit=' + expectedLimit)
      .send({
        queryFields: {

        },
        clauseOperator: "and"
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (response) {
        assert.ok(_.isArray(response.body.submissions), "Expected an array of submisisons");
        assert.ok(_.isNumber(response.body.total), "Expected a number for total submissions");
        assert.ok(_.isNumber(response.body.pages), "Expected a number for total submissions");
      })
      .end(function (err, res) {
        if (err) {
          logger.error(err, res);
        }
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        sinon.assert.calledOnce(searchSubmissionsStub);
        sinon.assert.calledWith(getMaxLimitValueStub, CONSTANTS.CONFIG_PROPERTIES.PAGINATION_MAX_LIMIT_KEY);
        sinon.assert.calledWith(getMaxLimitValueStub, CONSTANTS.CONFIG_PROPERTIES.PAGINATION_DEFAULT_LIMIT_KEY);

        done();
      });
  });

  it("Filter Submissions", function(done){
    var expectedPage = 3;
    var expectedLimit = 20;
    var expectedFormId = "someformid";
    var expectedProjectId = "someprojectid";
    var getSubmissionsStub = stubs.forms.core.getSubmissions({
      expectedPage: expectedPage,
      expectedLimit: expectedLimit,
      expectedFormId: expectedFormId,
      expectedProjectId: expectedProjectId
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          getSubmissions: getSubmissionsStub
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger),
        value: getMaxLimitValueStub
      }
    };

    var submissionsRouter = proxyquire('../../../../lib/routes/forms/submissions/router.js', mocks);

    fhConfig.setRawConfig(fixtures.config);

    var app = express();

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, submissionsRouter());

    supertest(app)
      .post(baseUrl + '/filter?page='+expectedPage + '&limit=' + expectedLimit)
      .send({
        formId: expectedFormId,
        appId: expectedProjectId
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (response) {
        assert.ok(_.isArray(response.body.submissions), "Expected an array of submisisons");
        assert.ok(_.isNumber(response.body.total), "Expected a number for total submissions");
        assert.ok(_.isNumber(response.body.pages), "Expected a number for total submissions");
      })
      .end(function (err, res) {
        if (err) {
          logger.error(err, res);
        }
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        sinon.assert.calledOnce(getSubmissionsStub);
        sinon.assert.calledWith(getMaxLimitValueStub, CONSTANTS.CONFIG_PROPERTIES.PAGINATION_MAX_LIMIT_KEY);
        sinon.assert.calledWith(getMaxLimitValueStub, CONSTANTS.CONFIG_PROPERTIES.PAGINATION_DEFAULT_LIMIT_KEY);

        done();
      });
  });

});
