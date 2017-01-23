var sinon = require('sinon');
var proxyquire = require('proxyquire');
var fhConfig = require('fh-config');
var fixtures = require('../../../../fixtures');
fhConfig.setRawConfig(fixtures.config);
var logger = fhConfig.getLogger();
var EventEmitter = require('events');

describe("Submission Export CSV Async", function() {

  beforeEach(function () {
    var self = this;

    //Generating mocks for Async CSV Export
    this.generateMocks = function(options, assertAndDone) {
      var mockCSVExportStatusInProgress = {
        status: 'inprogress',
        message: "Export In Progress"
      };
      var mockFilePath = "/path/to/export/dir";
      var expectedFileName = "testdomain_testenvironment_submissioncsvexport.zip";
      var expectedFullPath  = mockFilePath + "/" + expectedFileName;

      var mockSubmissionCSVValues = {
        'mockformid': "fieldtitle1,fieldtitle2\nvalue1,value2"
      };

      var mockFileDetails = {
        _id: "mockfileid"
      };

      self.mockData = {
        mockCSVExportStatusInProgress: mockCSVExportStatusInProgress,
        mockFilePath: mockFilePath,
        expectedFileName: expectedFileName,
        mockSubmissionCSVValues: mockSubmissionCSVValues,
        mockFileDetails: mockFileDetails,
        expectedFullPath: expectedFullPath
      };

      var mockStartCSVExport = sinon.stub().callsArgWith(1, undefined, mockCSVExportStatusInProgress);
      var mockExportSubmissions = sinon.stub().callsArgWith(2, undefined, mockSubmissionCSVValues);

      var mockFhForms = {
        core: {
          startCSVExport: mockStartCSVExport,
          exportSubmissions: mockExportSubmissions,
          updateCSVExportStatus: sinon.spy()
        }
      };

      var mockStorage = {
        registerFile: sinon.stub().callsArgWith(1, undefined, mockFileDetails),
        generateURL: assertAndDone
      };

      var mockFhConfig = {
        '@global': true,
        value: sinon.stub().returns(mockFilePath),
        getLogger: sinon.stub().returns(logger)
      };

      var mockFileStream = new EventEmitter();

      var mockArchiverZip = {
        pipe: sinon.spy(),
        append: sinon.spy(),
        finalize: function() {
          mockFileStream.emit('close');
        }
      };

      var mockArchiver = sinon.stub().returns(mockArchiverZip);

      var mockMkdirp = sinon.stub().callsArg(1);

      var mockStat = sinon.stub().callsArgWith(1, options.fileError, options.fileResponse);

      var mockFS = {
        stat: mockStat,
        unlink: sinon.stub().callsArg(1),
        createWriteStream: sinon.stub().returns(mockFileStream)
      };

      var mockNext = sinon.spy();

      var mockRequest = {
        body: {},
        connectionOptions: {
          uri: 'mongodb://some.mongo.url'
        },
        params: {
          domain: 'testdomain',
          environment: 'testenvironment'
        }
      };

      var mockResponse = {
        json: sinon.spy()
      };

      self.mocks = {
        'fh-forms': mockFhForms,
        '../../../../storage': mockStorage,
        'fh-config': mockFhConfig,
        'archiver': mockArchiver,
        'mkdirp': mockMkdirp,
        'fs': mockFS
      };

      self.stubs = {
        mockFileStream: mockFileStream,
        mockStartCSVExport: mockStartCSVExport,
        mockExportSubmissions: mockExportSubmissions,
        mockFS: mockFS,
        mockMkdirp: mockMkdirp,
        mockArchiverZip: mockArchiverZip,
        mockArchiver: mockArchiver,
        mockNext: mockNext,
        mockRequest: mockRequest,
        mockResponse: mockResponse
      };
    }

    this.assertThenDone = function(options, done) {

     return function assertAndDone() {

       //Expecting the CSV Start export process to be called
       sinon.assert.calledOnce(self.stubs.mockStartCSVExport);
       sinon.assert.calledWith(self.stubs.mockStartCSVExport, sinon.match(self.stubs.mockRequest.connectionOptions), sinon.match.func);

       sinon.assert.calledOnce(self.stubs.mockExportSubmissions);
       sinon.assert.calledWith(self.stubs.mockExportSubmissions, sinon.match({
         asyncCSVExport: true,
         uri: sinon.match(self.stubs.mockRequest.connectionOptions.uri)
       }), sinon.match.object, sinon.match.func);

       sinon.assert.calledOnce(self.stubs.mockMkdirp);
       sinon.assert.calledWith(self.stubs.mockMkdirp, sinon.match(self.mockData.mockFilePath), sinon.match.func);

       sinon.assert.calledOnce(self.stubs.mockFS.stat);
       sinon.assert.calledWith(self.stubs.mockFS.stat, sinon.match(self.mockData.expectedFullPath), sinon.match.func);

       if(options.expectFSUnlinkCalled) {
         sinon.assert.calledOnce(self.stubs.mockFS.unlink);
         sinon.assert.calledWith(self.stubs.mockFS.unlink, sinon.match(self.mockData.expectedFullPath), sinon.match.func);
       } else {
         sinon.assert.notCalled(self.stubs.mockFS.unlink);
       }

       sinon.assert.calledOnce(self.stubs.mockFS.createWriteStream);
       sinon.assert.calledWith(self.stubs.mockFS.createWriteStream, sinon.match(self.mockData.expectedFullPath));

       sinon.assert.calledOnce(self.stubs.mockArchiverZip.pipe);
       sinon.assert.calledWith(self.stubs.mockArchiverZip.pipe, sinon.match(self.stubs.mockFileStream));

       sinon.assert.calledOnce(self.stubs.mockArchiverZip.append);
       sinon.assert.calledWith(self.stubs.mockArchiverZip.append, sinon.match(self.mockData.mockSubmissionCSVValues.mockformid), sinon.match({
         name: sinon.match("mockformid.csv")
       }));

       sinon.assert.calledOnce(self.stubs.mockArchiver);

       sinon.assert.notCalled(self.stubs.mockNext);

       sinon.assert.calledOnce(self.stubs.mockResponse.json);
       sinon.assert.calledWith(self.stubs.mockResponse.json, sinon.match(self.mockData.mockCSVExportStatusInProgress));
       done();
     }
    }

  });

  it("Submission Export Should Ensure A File Exists", function(done) {
    var self = this;

    this.generateMocks({}, self.assertThenDone({}, done));

    var exportCSVAsync = proxyquire('../../../../../lib/routes/forms/submissions/handlers/exportCSVAsync', this.mocks);

    exportCSVAsync(self.stubs.mockRequest, self.stubs.mockResponse, self.stubs.mockNext);
  });

  it("Should Remove The File If It Exists", function(done) {
    var self = this;

    this.generateMocks({
      fileResponse: {
        path: "/path/to/file"
      }
    }, self.assertThenDone({
      expectFSUnlinkCalled: true
    }, done));

    var exportCSVAsync = proxyquire('../../../../../lib/routes/forms/submissions/handlers/exportCSVAsync', this.mocks);

    exportCSVAsync(self.stubs.mockRequest, self.stubs.mockResponse, self.stubs.mockNext);
  });


});