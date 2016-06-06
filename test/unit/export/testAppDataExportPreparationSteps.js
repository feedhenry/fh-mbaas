var fhConfig = require('fh-config');
var proxyquire =  require('proxyquire');
var sinon = require('sinon');
var _ = require('underscore');
var assert = require('assert');

fhConfig.setRawConfig({
  fhditch: {
    protocol: 'http',
    host: 'testing.feedhenry.me',
    port: '8802',
    service_key: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f'
  },
  fhdfc: {
    cache_timeout: 300
  }
});

var logger = fhConfig.getLogger();

var mongo = require('../../stubs/mongo/mongoMocks');
////////////// DITCH MOCK

const MOCK_DB_URL = 'mongodb://user:pass@host:port:dbName';

//var mongo = mongoMocks([{name:'a', size:1024}, {name:'b', size:2048}]);

var ditchHelperStub = {
  getAppInfo: function(appName, cb) {

    mongo.MongoClient.connect(MOCK_DB_URL, function(err, db) {
      db.collectionNames(function (err, collectionNames) {
        cb(null, {uri: MOCK_DB_URL, collections: collectionNames});
      });
    });
  }
}

var modelsMock = {
  exportJobs:{},
  AppdataJob: {
    id: 1234,
    progress: undefined,
    status: 'created',
    domain: 'testing',
    environment: 'dev',
    appid: 'ad7eykyyaqpcei52a5owfi2a',
    metadata: {
      fileSize: 0,
      fileDeleted: null,
      filePath: null,
      fileId: null,
      stopApp: true
    },
    updateMetadata: function (field, value) {
      this.metadata[field] = value;
    },
    aggregate: function(params, cb) {
      var total = 0;

      for (var i in this.exportJobs) {
        var job = this.exportJobs[i];
        if (job.status === 'created' || jobs.status === 'progress') {
          total += job.metadata.fileSize;
        }
      }

      cb(null, [{total: total}]);
    },
    save: function (cb) {
      var self = this;
      modelsMock.exportJobs[this.id] = {
        status: self.status,
        progress: self.progress
      };
      cb();
      //modelsMock.exportJobs.push(data);
    },
    set: function(field, value) {
      switch (field) {
        case 'progress':
          this.progress = value;
          break;
        case 'status':
          this.status = value;
          break;
      }
    }
  }
};

var diskSpaceMock = {
  check: sinon.spy(function(outDir, cb) {
    cb(null, 1000000, 1000000, undefined);
  })
};

var mkdirpMock = sinon.spy(function(path, cb) {
  cb(null);
});

var stopAppStub = sinon.stub();
stopAppStub.withArgs(sinon.match.array, sinon.match.func).callsArg(1);

var preparationSteps = proxyquire('lib/export/preparationSteps', {
  '../util/ditchhelper': ditchHelperStub,
  'mongodb': mongo,
  '../models' : modelsMock,
  'diskspace': diskSpaceMock,
  'mkdirp': mkdirpMock,
  ' ../util/dfutils': proxyquire('../../../lib/util/dfutils', {
    'fh-config': fhConfig,
    'fh-dfc': function () {
      return {
        "stop-app": stopAppStub,
        dynos : function(args, cb){
          return cb();
        },

        'read-app': function(args, cb){
          return cb();
        }
      }
    }
  })
});

var mockAppInfo = {
  name: 'app1-123456678-dev',
  guid: '123456678',
  environment: 'dev'
};

var exportJob = modelsMock.AppdataJob;
var TaggedLogger = require('lib/jobs/taggedLogger').TaggedLogger;

module.exports.test_prepare_export = function(done) {
  var context = {
    appInfo : mockAppInfo,
    exportJob : exportJob,
    outputDir : '/tmp',
    jobID: 'JOBID',
    logger: new TaggedLogger(logger, '[APPDATAEXPORT]')
  };

  preparationSteps.prepare(context, function(err, ctx) {
    assert.ok(mkdirpMock.calledOnce);
    assert.equal(mkdirpMock.args[0][0], '/tmp/123456678/dev/JOBID');
    assert.ok(diskSpaceMock.check.calledOnce);
    assert.ok(stopAppStub.calledOnce);
    done(err);
  });
};

module.exports.test_prepare_export_no_stop = function(done) {
  var context = {
    appInfo : mockAppInfo,
    exportJob : exportJob,
    outputDir : '/tmp',
    jobID: 'JOBID',
    logger: new TaggedLogger(logger, '[APPDATAEXPORT]')
  };

  context.exportJob.metadata.stopApp = false;
  mkdirpMock.reset();
  diskSpaceMock.check.reset();
  stopAppStub.reset();

  preparationSteps.prepare(context, function(err, ctx) {
    assert.ok(mkdirpMock.calledOnce);
    assert.equal(mkdirpMock.args[0][0], '/tmp/123456678/dev/JOBID');
    assert.ok(diskSpaceMock.check.calledOnce);
    assert.equal(false, stopAppStub.calledOnce);
    done(err);
  });
};

