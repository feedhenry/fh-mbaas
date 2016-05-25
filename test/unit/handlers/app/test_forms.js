var supertest = require('supertest');
var proxyquire = require('proxyquire');
var fixtures = require('../../../fixtures');
var stubs = require('../../../stubs');
var express = require('express');
var assert = require('assert');
var sinon = require('sinon');
var util = require('util');
var fhConfig = require('fh-config');
fhConfig.setRawConfig(fixtures.config);
var logger = fhConfig.getLogger();
var fs = require('fs');
var _ = require('underscore');
var baseRoutePath = '/:domain/:environment/:projectid/:appid/appforms';
var baseUrl = '/mockdomain/mockenv/mockproject/mockapp/appforms';

describe("Forms App Submissions Router", function() {

  describe("submissions/:id/exportpdf tests", function(done) {
    var exportpdfUrl = baseUrl + '/submissions/123/exportpdf'
    var formsRouter;

    beforeEach(function createDownloadFile() {
      fs.closeSync(fs.openSync(fixtures.forms.submissions.get().downloadFile, 'w'));
    });

    before(function createRouter() {
      var generatePDFStub = stubs.forms.core.generateSubmissionPdf();
      var deps = {
        'fh-forms': {
          '@global': true,
          core: {
            generateSubmissionPdf: generatePDFStub
          }
        },
        'fh-mbaas-middleware': _.clone(stubs.mbaasMiddleware),
        'fh-config': {
          '@global': true,
          getLogger: sinon.stub().returns(logger),
          value: fhConfig.value
        }
      };
      formsRouter = proxyquire('../../../../lib/handlers/app/forms.js', deps);
    });

    it("should export submission when all parameters are provided", function(done) {
      var app = express();
      app.use(setRequestParams('example.com.org', 'somepath'));
      app.use(baseRoutePath, formsRouter);

      supertest(app)
        .get(exportpdfUrl)
        .expect(200)
        .expect('Content-Type', /pdf/)
        .expect(function verifyResponse(response) {
          assert.ok(response);
        })
        .end(function (err, res) {
          assert.ok(!err, "Expected No Error " + util.inspect(err));
          done();
        });
    });

    it("should return 500 if coreHost is missing", function(done) {
      var app = express();
      app.use(setRequestParams(undefined, 'somepath'));
      app.use(baseRoutePath, formsRouter);

      assertInternalServerError(app, exportpdfUrl, done);
    });

    it("should return 500 if fileUriPath is missing", function(done) {
      var app = express();
      app.use(setRequestParams('example.com.org', undefined));
      app.use(baseRoutePath, formsRouter);

      assertInternalServerError(app, exportpdfUrl, done);
    });

  });
});

function setRequestParams(coreHost, fileUriPath) {
  return function setRequestParameters(req, res, next) {
    req.appMbaasModel = {
    'coreHost': coreHost
    };
    req.fileUriPath = fileUriPath
    next();
  };
}

function assertInternalServerError(app, url, done) {
  supertest(app)
    .get(url)
    .expect(500)
    .end(function (err, res) {
      assert.ok(!err, "Expected Invalid Arguments" + util.inspect(err));
      done();
    });
}
