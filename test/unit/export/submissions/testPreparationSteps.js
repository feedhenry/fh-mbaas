var assert = require('assert');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var _ = require('underscore');
var fixtures = require('../../../fixtures/index.js');

function stubFindOne(context, failWithError) {
  var stub = sinon.stub();
  var options = {
    domain: context.exportJob.domain,
    environment: context.exportJob.environment
  };

  if(failWithError){
    stub.withArgs(sinon.match(options), sinon.match.func).callsArgWithAsync(1, "MOCK ERROR");
  } else {
    var envDb = {
      dbConf: fixtures.envConfig().dbConf
    };
    stub.withArgs(sinon.match(options), sinon.match.func).callsArgWithAsync(1, null, envDb);
  }

  stub.withArgs(sinon.match.object, sinon.match.func).callsArgWithAsync(1, null, undefined);
  return stub;
}

function setUpMocks(context, failWithError){
  var self = this;
  this.mbaasMiddleware = mbaasMiddlewareStub(stubFindOne(context, failWithError));
  var preparation = proxyquire('../../../../lib/export/submissions/preparationSteps.js', {
    'fh-mbaas-middleware': this.mbaasMiddleware,
    'connectToDatabase': sinon.stub().yields(),
    'retrieveCollectionsSize': sinon.stub().yields(),
    'reserveSpaceIfAvailable': sinon.stub().yields(),
    'createOutputDir': sinon.stub().yields()
  });
  this.prepare = preparation.prepare;
}

describe('Submissions Export Preparation', function(){

  describe('It should get the environment database configuration from fh-mbaas-middleware', function() {
    var context = createContext("mockdomain", "mockenvid");

    it("It should successfully call getEnvDbConf", function(done) {
      var that = this;
      _.bind(setUpMocks, this)(context);
      this.prepare(context, function(err, context) {
        assert.ok(context.uri, 'mongodb://someuser:somepassword@some.mongo.host,some.mongo.host2:27017/mockdomain_mockenv');
        done();
      });
    });

    it("It should return an error if context.subExportJob.domain is undefined", function(done) {
      _.bind(setUpMocks, this)(context);
      this.prepare(createContext(undefined, "mockenvid"), function(err, callback) {
        assert.equal(err, 'No Environment Database available for environment mockenvid and domain undefined');
        done();
      });
    });

    it("It should return an error if context.subExportJob.environment is undefined", function(done) {
      _.bind(setUpMocks, this)(context);
      this.prepare(createContext("mockdomain", undefined), function(err, callback) {
        assert.equal(err, 'No Environment Database available for environment undefined and domain mockdomain');
        done();
      });
    });

    it("It should return an error if getEnvDbConf fails", function(done) {
      _.bind(setUpMocks, this)(context, true);
      this.prepare(context, function(err, callback) {
        assert.ok(err, 'should return an error if domain in undefined');
        assert.equal(err, 'Error getting environment database: MOCK ERROR');
        done();
      });
    });

  });

});

function createContext(domain, environment) {
  var fhConfig = require('fh-config');
  fhConfig.setRawConfig({});
  var TaggedLogger = require('../../../../lib/jobs/taggedLogger').TaggedLogger;
  var logger = fhConfig.getLogger();
  return {
    exportJob: {
      domain: domain,
      environment: environment,
      status: "created",
      jobId: 'mockJobId'
    },
    outputDir: "/some/output/dir/for/data",
    logger : new TaggedLogger(logger.child({job: 'mockJobId'}), 'TESTSUBMISSION_PREPARATION')
  };
}

function mbaasMiddlewareStub(findOneStub) {
  return {
    models: {
      getModels: function() {
        return {
          Mbaas: {
            findOne: findOneStub
          }
        }
      }
    }
  };
}
