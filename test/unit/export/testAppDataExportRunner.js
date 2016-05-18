var fhConfig = require('fh-config');
var proxyquire =  require('proxyquire');
var sinon = require('sinon');
var _ = require('underscore');

const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;

fhConfig.setRawConfig({
  fhditch: {
    protocol: 'http',
    host: 'testing.feedhenry.me',
    port: '8802',
    service_key: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f'
  }
});

var logger = fhConfig.getLogger();

var assert = require('assert');
var sinon = require('sinon');

var modelsMock = {
  exportJobs:{},
  ExportJob: {
    id: 1234,
    progress: undefined,
    status: 'created',
    aggregate: function(params, cb) {
      var total = 0;

      for (var i in this.exportJobs) {
        var job = this.exportJobs[i];
        if (job.status === 'created' || jobs.status === 'progress') {
          total += job.fileSize;
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
  registerFile: function(path, cb) {
    cb(null, fileModelMock);
  }
}

var AppExportRunner = proxyquire('lib/export/AppDataExportRunner',
  {
    './preparationSteps': prepStepsMock,
    './appDataExport': appDataExportMock,
    '../storage/index': storageMock
  }).AppExportRunner;

module.exports.test_export_shared_app = function(done) {
  var mockAppInfo = {
    name: 'app1-123456678-dev',
    guid: '123456678',
    environment: 'dev'
  };

  var exportJob = modelsMock.ExportJob;

  var context = {
    appInfo : mockAppInfo,
    exportJob : exportJob,
    outputDir : '/tmp',
    jobId: 'JOBID',
    logger: logger
  };

  var appExportRunner = new AppExportRunner(context)
    .on(FINISH_EVENT, function() {
    done();
  }).on(FAIL_EVENT, function(message) {
    done('failed ' + JSON.stringify(message));
  });


  appExportRunner.run();
};

