var sinon = require('sinon');
var proxyquire = require('proxyquire');
var assert = require('assert');
var _ = require('underscore');

var cfg = {
  mongo: {
    host: 'localhost',
    port: 8888,
    admin_auth : {
      user: 'admin',
      pass: 'admin'
    }
  },
  fhdfc: {
    "dynofarm": "http://localhost:9000",
    "username":"feedhenry",
    "_password": "feedhenry101",
    "loglevel": "warn"
  }
};

var fhconfig = require('fh-config');
fhconfig.setRawConfig(cfg);

var mockRequest = {
  params: {
    domain: "somedomain",
    environment: "someenvironment",
    appname: "some-appguid-env"
  },
  body: {
    apiKey: "someappapikey",
    coreHost: "some.core.host.com",
    appGuid: "appguid",
    type: "feedhenry"
  }
};


module.exports = {
  test_find_app: function(finish){
    var mockFindModel = sinon.stub().callsArgWith(1, undefined, {
      name: "some-appguid-env"
    });
    var mockNextCall = sinon.spy();

    var mockModels = sinon.stub().returns({
      AppMbaas: {
        findOne: mockFindModel
      }
    });

    var mocks = {
      '../models.js': {
        getModels: mockModels
      }
    };

    var appMiddleware = proxyquire('../../../lib/middleware/app.js', mocks);

    var req = _.clone(mockRequest);

    appMiddleware.findMbaasApp(req, {}, mockNextCall);

    assert.ok(mockNextCall.calledWithExactly(), "Expected Called");

    assert.equal(req.appMbaasModel.name, "some-appguid-env");

    finish();
  },
  test_find_app_not_found: function(finish){
    var mockFindModel = sinon.stub().callsArgWith(1, undefined, null);
    var mockNextCall = sinon.spy();

    var mockModels = sinon.stub().returns({
      AppMbaas: {
        findOne: mockFindModel
      }
    });

    var mocks = {
      '../models.js': {
        getModels: mockModels
      }
    };

    var appMiddleware = proxyquire('../../../lib/middleware/app.js', mocks);

    var req = _.clone(mockRequest);

    appMiddleware.findMbaasApp(req, {}, mockNextCall);

    assert.ok(mockNextCall.calledWithExactly(), "Expected Called With No Error");

    assert.equal(req.appMbaasModel, null);

    finish();
  },
  test_find_or_create_app: function(finish){
    var mockFindModel = sinon.stub().callsArgWith(1, undefined, null);
    var mockNextCall = sinon.spy();
    var mockCreateModel = sinon.stub().callsArgWith(1, undefined, {
      name: mockRequest.params.appname
    });

    var mockModels = sinon.stub().returns({
      AppMbaas: {
        findOne: mockFindModel,
        createModel: mockCreateModel
      }
    });

    var mocks = {
      '../models.js': {
        getModels: mockModels
      }
    };

    var appMiddleware = proxyquire('../../../lib/middleware/app.js', mocks);

    var req = _.clone(mockRequest);

    appMiddleware.findOrCreateMbaasApp(req, {}, mockNextCall);

    assert.ok(mockNextCall.calledWithExactly(), "Expected Called With No Error");

    assert.equal(req.appMbaasModel.name,  mockRequest.params.appname);

    finish();
  }
};