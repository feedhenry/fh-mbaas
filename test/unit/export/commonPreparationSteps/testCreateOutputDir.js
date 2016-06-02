var assert = require('assert');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var fixtures = require('../../../fixtures/index.js');
var path = require('path');
var os = require('os');

describe('Common Export Preparation Steps', function() {

  describe('createOutputDir', function() {
      var createOutputDir = require('../../../../lib/export/commonPreparationSteps/createOutputDir');

    it("It should successfully create the output directory", function(done) {
      var context = createContext();
      context.outputPath = pathFrom(context);
      createOutputDir(context, function(err, context) {
        assert.equal(context.path, context.outputPath);
        done();
      });
    });

  });

});

function pathFrom(context) {
  var exportJob = context.exportJob;
  return path.join(context.outputDir, exportJob.domain, exportJob.environment, exportJob.jobId);
}

function createContext(outputDir) {
  var fhConfig = require('fh-config');
  fhConfig.setRawConfig({});
  var TaggedLogger = require('../../../../lib/jobs/taggedLogger').TaggedLogger;
  var logger = fhConfig.getLogger();

  return {
    exportJob: {
      domain: 'mochdomain',
      environment: 'mochevid',
      status: "created",
      jobId: 'mochJobId'
    },
    outputDir: os.tmpdir(),
    logger : new TaggedLogger(logger.child({job: 'mockJobId'}), 'TESTSUBMISSION_PREPARATION')
  };
}

