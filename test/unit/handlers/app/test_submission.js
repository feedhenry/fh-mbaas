var proxyquire = require('proxyquire');
var fixtures = require('../../../fixtures');
var stubs = require('../../../stubs');
var sinon = require('sinon');
var assert = require('assert');
var fhConfig = require('fh-config');
fhConfig.setRawConfig(fixtures.config);
var logger = fhConfig.getLogger();

describe("Complete Submission", function() {

  beforeEach(function createRouter() {
    var self = this;

    self.createMocks = function(expectedSubmissionStatus) {
      self.mockSubmission = fixtures.forms.submissions.get();

      self.getSubmissionEmailDataStub = stubs.forms.core.getSubmissionEmailData();
      self.completeFormSubmissionStub = stubs.forms.core.completeFormSubmission(expectedSubmissionStatus);

      var mocks = {
          '../../../util/logger': {
            getLogger: sinon.stub().returns(logger)
          },
          'fh-forms': {
            core: {
              completeFormSubmission: self.completeFormSubmissionStub,
              getSubmissionEmailData: self.getSubmissionEmailDataStub
            }
          }
        };

      self.appFormsHandler = proxyquire('../../../../lib/handlers/app/handlers/completeSubmission.js', mocks);
    };
  });

  it("should get the submission result when it has completed", function(done) {
    var self = this;
    var expectedSubmissionStatus = 'complete';

    self.createMocks(expectedSubmissionStatus);

    var mockRequest = {
      params: {
        id: this.mockSubmission._id
      },
      connectionOptions: {
        uri: fixtures.mockMongoUrl
      }
    };

    var mockResponse = {
      status: sinon.spy(),
      json: sinon.spy()
    };

    this.appFormsHandler(mockRequest, mockResponse, function(err) {
      assert.ok(!err, "Expected no error" + err);

      sinon.assert.calledOnce(self.getSubmissionEmailDataStub);
      sinon.assert.calledOnce(self.completeFormSubmissionStub);

      //The request should not have been ended.
      sinon.assert.notCalled(mockResponse.status);
      sinon.assert.notCalled(mockResponse.json);

      assert.equal(expectedSubmissionStatus, mockRequest.appformsResultPayload.data.status, "Expected the status of the submission completion to be complete");
      assert.equal(self.mockSubmission._id, mockRequest.appformsResultPayload.data.formSubmission._id);

      done();
    })
  });

  it("should return the submission result if it is pending", function(done) {
    var self = this;

    var expectedSubmissionStatus = 'pending';

    self.createMocks(expectedSubmissionStatus);

    var mockRes = {
      json: sinon.spy()
    };

    var nextSpy = sinon.spy();

    var statusStub = sinon.stub().returns(mockRes);

    var mockRequest = {
      params: {
        id: self.mockSubmission._id
      },
      connectionOptions: {
        uri: fixtures.mockMongoUrl
      }
    };

    var mockResponse = {
      status: statusStub
    };

    this.appFormsHandler(mockRequest, mockResponse, nextSpy);

    sinon.assert.calledOnce(statusStub);
    sinon.assert.calledWith(statusStub, sinon.match(200));

    sinon.assert.calledOnce(mockRes.json);
    sinon.assert.calledWith(mockRes.json, sinon.match({status: expectedSubmissionStatus}));

    sinon.assert.notCalled(nextSpy);

    done();
  });

});