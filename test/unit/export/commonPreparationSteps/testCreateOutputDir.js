const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const path = require('path');
const target = '../../../../lib/export/commonPreparationSteps/createOutputDir';

describe('Common Export Preparation Steps', function() {

  describe('createOutputDir', function() {
    const outputDir = "/non/existing/outputdir";
    const context = createContext(outputDir);
    const mkdirp = mkdirpStub(context);
    const createOutputDir = proxyquire(target, {'mkdirp': mkdirp});

    it("It should successfully create the output directory", function(done) {
      createOutputDir(context, function(err, context) {
        assert(mkdirp.calledOnce);
        assert.equal(context.path, context.outputPath, "context.path should have been set to the created output dir.");
        done();
      });
    });

    it("It should fail if context.outputPath is not present on the context", function(done) {
      context.outputPath = 'bogus';
      createOutputDir(context, function(err, context) {
        assert(err, "Should error if call does not have the context.outputPath set.");
        done();
      });
    });

  });

});

function mkdirpStub(context) {
  const mkdirp = sinon.stub();
  mkdirp.withArgs(sinon.match(context.outputPath), sinon.match.func).yields(undefined);
  mkdirp.yields("Call did not have the required 'outputPath' property set on its context");
  return mkdirp;
}

function pathFrom(context) {
  var exportJob = context.exportJob;
  return path.join(context.outputDir, exportJob.domain, exportJob.environment, exportJob.jobId);
}

function createContext(outputDir) {
  const fhConfig = require('fh-config');
  fhConfig.setRawConfig({});
  const TaggedLogger = require('../../../../lib/jobs/taggedLogger').TaggedLogger;
  const logger = fhConfig.getLogger();

  const context = {
    exportJob: {
      domain: 'mochdomain',
      environment: 'mochevid',
      status: "created",
      jobId: 'mochJobId'
    },
    outputDir: outputDir,
    logger : new TaggedLogger(logger.child({job: 'mockJobId'}), 'TESTSUBMISSION_PREPARATION')
  }
  context.outputPath = pathFrom(context);
  return context;
}

