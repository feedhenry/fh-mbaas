var fhConfig = require('fh-config');
var proxyquire =  require('proxyquire');
var sinon = require('sinon');
var _ = require('underscore');
const contextBuilder = require('lib/jobs/context').contextBuilder;

const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;

fhConfig.setRawConfig({
  fhditch: {
    protocol: 'http',
    host: 'testing.feedhenry.me',
    port: '8802',
    service_key: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f'
  },
  openshift3: {
  },
  "fhdfc": {
    "dynofarm": "http://localhost:9000",
    "username":"DYNOFARM_USERNAME",
    "_password": "DYNOFARM_PASSWORD",
    "loglevel": "warn",
    "cache_timeout": 300000
  },
});

var logger = fhConfig.getLogger();
fhConfig["@global"] = true;
fhConfig.getLogger = sinon.stub().returns(logger);

var assert = require('assert');
var sinon = require('sinon');

var modelsMock = {
  exportJobs:{},
  AppdataJob: {
    id: 1234,
    _id: {
      toString: function() {
        return '1234';
      }
    },
    progress: undefined,
    status: 'created',
    metadata: {
      fileSize: 0,
      fileDeleted: null,
      filePath: null,
      fileId: null
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

var prepStepsMock = {
  prepare: function(context, cb) {
    context.collections=['collection1','collection2','collection3'];
    context.size= 4096;
    cb(null, context);
  }
};

var appDataExportMock = {
  exportData: function(context, cb) {
    context.archive = {path: '/tmp/data.tar'};
    cb(null, context);
  }
};

var fileModelMock = {
  id: sinon.spy()
}

var storageMock = {
  '@global': true,
  registerFile: function(path, cb) {
    cb(null, fileModelMock);
  }
}

var AppExportRunner = proxyquire('lib/export/AppDataExportRunner',
  {
    './preparationSteps': prepStepsMock,
    './appDataExport': appDataExportMock,
    '../../storage': storageMock,
    'fh-config': fhConfig
  }).AppExportRunner;

module.exports.test_export_shared_app = function(done) {
  var mockAppInfo = {
    name: 'app1-123456678-dev',
    guid: '123456678',
    environment: 'dev'
  };

  var exportJob = modelsMock.AppdataJob;

  var context = contextBuilder()
    .withApplicationInfo(mockAppInfo)
    .withJobModel(exportJob)
    .withCustomAtt('outputDir', '/tmp')
    .withLogger(logger)
    .build();

  var appExportRunner = new AppExportRunner(context)
    .on(FINISH_EVENT, function() {
    done();
  }).on(FAIL_EVENT, function(message) {
    done('failed ' + JSON.stringify(message));
  });


  appExportRunner.run();
};

