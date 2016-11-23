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
var bodyParser = require('body-parser');
var baseRoutePath = '/:domain/:environment/:projectid/:appid/appforms';
var baseUrl = '/mockdomain/mockenv/mockproject/mockapp/appforms';
var archiver = require('archiver');

describe("Forms App Submissions Router", function() {

  function setRequestParams(coreHost, fileUriPath, cloudAppUrl, cloudAppGuid) {
    return function setRequestParameters(req, res, next) {
      req.appMbaasModel = {
        'coreHost': coreHost,
        'url': cloudAppUrl,
        'guid': cloudAppGuid
      };
      req.fileUriPath = fileUriPath;

      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    };
  }

  function assertInternalServerError(app, url, done) {
    supertest(app)
      .get(url)
      .expect(500)
      .end(function (err) {
        assert.ok(!err, "Expected Invalid Arguments" + util.inspect(err));
        done();
      });
  }

  describe("submissions/:id/exportpdf tests", function() {
    var mockSubmission = fixtures.forms.submissions.get();
    var exportpdfUrl = baseUrl + '/submissions/' + mockSubmission._id + '/exportpdf';
    var mockPDFFileLocation = "/some/path/to/generated/file.pdf";
    var formsRouter;

    var getValueStub = sinon.stub();
    getValueStub.withArgs(sinon.match('fhmbaas.pdfExportDir')).returns(mockPDFFileLocation);

    beforeEach(function createDownloadFile() {
      fs.closeSync(fs.openSync(mockSubmission.downloadFile, 'w'));
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
          value: getValueStub
        }
      };
      formsRouter = proxyquire('../../../../lib/handlers/app/forms.js', deps);
    });

    it("should export submission when all parameters are provided", function(done) {
      var app = express();
      var expectedUrl = "https://some.path.to.cloud.app/mbaas/forms/somecloudappguid/submission/:id/file/:fileId";
      app.use(setRequestParams(mockSubmission.location, mockSubmission.fileUrlPath, expectedUrl));
      app.use(baseRoutePath, formsRouter);

      supertest(app)
        .get(exportpdfUrl)
        .expect(200)
        .expect('Content-Type', /pdf/)
        .expect(function verifyResponse(response) {
          assert.ok(response);
        })
        .end(function (err) {
          assert.ok(!err, "Expected No Error " + util.inspect(err));
          done();
        });
    });

    it("should return 500 if coreHost is missing", function(done) {
      var app = express();
      app.use(setRequestParams(undefined, mockSubmission.fileUrlPath));
      app.use(baseRoutePath, formsRouter);

      assertInternalServerError(app, exportpdfUrl, done);
    });

    it("should return 500 if fileUriPath is missing", function(done) {
      var app = express();
      app.use(setRequestParams(mockSubmission.location, undefined));
      app.use(baseRoutePath, formsRouter);

      assertInternalServerError(app, exportpdfUrl, done);
    });

  });

  describe("submissions/export tests", function() {
    var mockSubmission = fixtures.forms.submissions.get();
    var exportCSVUrl = baseUrl + '/submissions/export';
    var mockAppGuid = "somecloudappguid";

    var mockAppUrl = "https://some.path.to.cloud.app";

    var expectedUrl = "https://some.path.to.cloud.app/mbaas/forms/somecloudappguid/submission/:id/file/:fileId";
    var formsRouter;

    //Proxyquire was causing errors with archiver.
    //Proxyquiring archiver with the module seems to have solved the proble.
    archiver['@global'] = true;

    before(function createRouter() {
      var exportCSVStub = stubs.forms.core.exportSubmissions(expectedUrl);
      var deps = {
        'fh-forms': {
          '@global': true,
          core: {
            exportSubmissions: exportCSVStub
          }
        },
        'fh-mbaas-middleware': _.clone(stubs.mbaasMiddleware),
        'fh-config': {
          '@global': true,
          getLogger: sinon.stub().returns(logger),
          value: fhConfig.value
        },
        'archiver': archiver
      };
      formsRouter = proxyquire('../../../../lib/handlers/app/forms.js', deps);
    });

    it("should export submissions when all parameters are provided", function(done) {
      var app = express();

      app.use(bodyParser.json());
      app.use(setRequestParams(mockSubmission.location, mockSubmission.fileUrlPath, mockAppUrl, mockAppGuid));
      app.use(baseRoutePath, formsRouter);

      supertest(app)
        .post(exportCSVUrl)
        .send({})
        .expect(200)
        .expect('Content-Type', "application/zip")
        .expect('Content-disposition', 'attachment; filename=submissions.zip')
        .expect(function verifyResponse(response) {
          assert.ok(response);
        })
        .end(function (err) {
          assert.ok(!err, "Expected No Error " + util.inspect(err));
          done();
        });
    });
  });
});


