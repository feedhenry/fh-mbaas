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


describe("Submission Data Export", function() {

  before(function(done) {
    var mockSubmissionExportJobId = "somesubmissionexportjobid";
    const LOG_TAG = "[TESTSUBMISSIONEXPORT]";

    this.context = {
      collections: ["formsubmissions", "fileStorage.files", "fileStorage.chunks"],
      uri: "mongodb://mock.mongo.url/mockdomain_mockenvid",
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

  describe("It should handle exporting submissions collections", function() {

    before(function(done) {

      var SubmissionExportRunner = require('../../../../lib/export/submissions/SubmissionExportRunner').SubmissionExportRunner;

      this.runner = new SubmissionExportRunner(this.context);

      //Listening for events from the submission export process
      this.progressEventSpy = sinon.spy();

      this.runner.on(PROGRESS_EVENT, this.progressEventSpy);

      this.mongoExportWrapperStub = sinon.stub();
      this.mongoExportWrapperStub.withArgs(sinon.match.object, sinon.match(this.context), sinon.match("formsubmissions")
        .or(sinon.match("fileStorage.files"))
        .or(sinon.match("fileStorage.chunks")),
        sinon.match("formsubmissions.bson.gz")
        .or(sinon.match("fileStorage.files.bson.gz"))
        .or(sinon.match("fileStorage.chunks.bson.gz")), sinon.match.number, sinon.match(3), sinon.match.func)
        .callsArgWith(6, null);
      this.mongoExportWrapperStub.throws("Invalid Arguments");

      this.createExportArchiveStub = sinon.stub();
      this.createExportArchiveStub.withArgs(sinon.match(this.context), sinon.match.func)
        .callsArgWith(1, null, this.context);
      this.createExportArchiveStub.throws("Invalid Arguments");

      var mocks = {
        '../mongoExportFunctions': {
          mongoExportWrapper: this.mongoExportWrapperStub,
          createExportArchive: this.createExportArchiveStub
        }
      };

      this.submissionDataExport = proxyquire('../../../../lib/export/submissions/submissionDataExport', mocks);

      //The export data function is always bound to the submission runnder
      this.exportData = _.bind(this.submissionDataExport.exportData, this.runner);

      this.exportData(this.context, done);
    });

    it("It should export three submissions callections (formsubmissions, fileStorage.files, fileStorage.chunks)", function(done) {
      sinon.assert.calledThrice(this.mongoExportWrapperStub);
      done();
    });

    it("It should emit progress event for each of the collections", function(done) {
      sinon.assert.calledThrice(this.progressEventSpy);
      sinon.assert.calledWith(this.progressEventSpy, "running", 1, 3);
      sinon.assert.calledWith(this.progressEventSpy, "running", 2, 3);
      sinon.assert.calledWith(this.progressEventSpy, "running", 3, 3);
      done();
    });

  });


});