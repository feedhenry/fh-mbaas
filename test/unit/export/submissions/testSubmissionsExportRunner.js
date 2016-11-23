var assert = require('assert');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var fhConfig = require('fh-config');
var _ = require('underscore');

fhConfig.setRawConfig({
});

var logger = fhConfig.getLogger();
var TaggedLogger = require('../../../../lib/jobs/taggedLogger').TaggedLogger;

var progressPublisher = require('../../../../lib/jobs/progressPublisher');

const PROGRESS_EVENT = progressPublisher.PROGRESS_EVENT;
const STATUS_EVENT = progressPublisher.STATUS_EVENT;
const FINISH_EVENT = progressPublisher.FINISH_EVENT;
const FAIL_EVENT = progressPublisher.FAIL_EVENT;
const HEARTBEAT_EVENT = 'heartbeat';

function stubWithContextCallback(context, failWithError) {
  var stub = sinon.stub();


  if(failWithError){
    stub.withArgs(sinon.match(context), sinon.match.func).callsArgWithAsync(1, "MOCK ERROR");
  } else {
    stub.withArgs(sinon.match(context), sinon.match.func).callsArgWithAsync(1, null, context);
  }


  stub.throws("Invalid Arguments");

  return stub;
}

function setUpMocks(failOnPrepare){
  this.registerStorageStub = stubWithContextCallback(this.context);

  this.updateModelWithStorageDataStub = stubWithContextCallback(this.context);

  this.cleanUpStub = stubWithContextCallback(this.context);

  this.exportDataStub = stubWithContextCallback(this.context);

  this.prepareStub = stubWithContextCallback(this.context, failOnPrepare);

  var mocks = {
    '../commonJobFunctions': {
      registerStorage: this.registerStorageStub,
      updateModelWithStorageData: this.updateModelWithStorageDataStub,
      cleanUp: this.cleanUpStub
    },
    './submissionDataExport': {
      exportData: this.exportDataStub
    },
    './preparationSteps': {
      prepare:  this.prepareStub
    }
  };

  var SubmissionExportRunner = proxyquire('../../../../lib/export/submissions/SubmissionExportRunner', mocks).SubmissionExportRunner;

  this.runner = new SubmissionExportRunner(this.context);

  //Listening for events from the submission export process
  this.progressEventSpy = sinon.spy();

  this.statusEventSpy = sinon.spy();

  this.finishEventSpy = sinon.spy();

  this.failEventSpy = sinon.spy();

  this.heartbeatEventSpy = sinon.spy();

  this.runner.on(PROGRESS_EVENT, this.progressEventSpy);

  this.runner.on(STATUS_EVENT, this.statusEventSpy);

  this.runner.on(FINISH_EVENT, this.finishEventSpy);

  this.runner.on(FAIL_EVENT, this.failEventSpy);

  this.runner.on(HEARTBEAT_EVENT, this.heartbeatEventSpy);
}


describe('Submissions Export Runner', function(){


  before(function(done){

    var mockSubmissionExportJobId = "somesubmissionexportjobid";
    const LOG_TAG = "[TESTSUBMISSIONEXPORT]";

    this.context = {
      collections: ["formsubmissions", "fileStorage.files", "fileStorage.chunks"],
      exportJob: {
        domain: "mockdomain",
        environment: "mockenvid",
        status: "created"
      },
      jobID: mockSubmissionExportJobId,
      outputDir: "/some/output/dir/for/data",
      logger : new TaggedLogger(logger.child({job: mockSubmissionExportJobId}), LOG_TAG)
    };

    done();
  });


  describe('It should execute all of the required steps for submission export', function() {
    before(function(done) {
      _.bind(setUpMocks, this)();

      this.runner.run();

      done();
    });

    it("It should call a preparation step", function(done) {
      sinon.assert.calledOnce(this.prepareStub);
      done();
    });

    it("It should call an export step", function(done){
      sinon.assert.calledOnce(this.exportDataStub);
      done();
    });

    it("It should call a cleanup step", function(done){
      sinon.assert.calledOnce(this.cleanUpStub);
      done();
    });

    it("It should emit a progress event with completion", function(done){
      sinon.assert.calledOnce(this.progressEventSpy);
      sinon.assert.calledWith(this.progressEventSpy, sinon.match("complete"), sinon.match.number, sinon.match.number);
      done();
    });

    it("It should NOT emit a fail event", function(done){
      sinon.assert.notCalled(this.failEventSpy);
      done();
    });

  });

  describe("It should handler errors during a submission export", function(){

    before(function(done){

      //The preparation step should fail.
      _.bind(setUpMocks, this)(true);

      this.runner.run();

      done();
    });

    it("It should emit an error event when there has been an error", function(done){
      sinon.assert.calledOnce(this.failEventSpy);
      done();
    });

    it("It should NOT call an export step", function(done){
      sinon.assert.notCalled(this.exportDataStub);
      done();
    });

    it("It should call a cleanup step", function(done){
      sinon.assert.calledOnce(this.cleanUpStub);
      done();
    });

    it("It should NOT emit a progress event with completion", function(done){
      sinon.assert.notCalled(this.progressEventSpy);
      done();
    });

  });

});