var proxyquire = require('proxyquire');
var assert = require('assert');
var sinon = require('sinon');

var MODULE_PATH = '../../../lib/jobs/appDataJob';

var mockAppMbaasModel = null;
var sandbox = null;
var contextToVerify = null;
var mockExportRunner = function(context) {
  contextToVerify = context;
};
mockExportRunner.prototype.run = function() {};
var mockImportRunner = function(context) {
  contextToVerify = context;
};
mockImportRunner.prototype.run = function() {};

var mockProgressPersistor = function() {
  this.listen = function() {};
};

var appDataJob = null;

module.exports = {
  'before': function() {
    sandbox = sinon.sandbox.create();
    mockAppMbaasModel = {
      findOne: sandbox.stub()
    };
    appDataJob = proxyquire(MODULE_PATH, {
      'fh-mbaas-middleware': {
        'models': {
          getModels: function() {
            return {
              AppMbaas: mockAppMbaasModel
            };
          }
        }
      },
      '../export/AppDataExportRunner': {
        AppExportRunner: mockExportRunner
      },
      '../appdata/import/appDataImportRunner': {
        AppDataImportRunner: mockImportRunner
      },
      './progressPersistor': {
        ProgressPersistor: mockProgressPersistor
      }
    });
  },

  'after': function() {
    sandbox.restore();
  },

  'test_export_start': function(done) {
    var appModel = {
      _id: 'testExportJobModel',
      appid: 'testApp',
      environment: 'test',
      jobType: 'export',
      toJSON: function() {
        return {};
      }
    };

    var appData = {
      id: 'testAppData'
    };

    mockAppMbaasModel.findOne.yields(null, appData);
    appDataJob.start(appModel);
    assert.ok(contextToVerify.appInfo);
    assert.ok(contextToVerify.jobModel);
    assert.equal(contextToVerify.jobID, appModel._id);
    assert.ok(contextToVerify.logger);
    done();
  },

  'test_import_start': function(done) {
    var appModel = {
      _id: 'testImportJobModel',
      appid: 'testApp',
      environment: 'test',
      jobType: 'import',
      toJSON: function() {
        return {};
      },
      metadata: {
        filePath: 'testfilepath'
      }
    };

    var appData = {
      id: 'testAppData'
    };

    mockAppMbaasModel.findOne.yields(null, appData);
    appDataJob.start(appModel);
    assert.ok(contextToVerify.appInfo);
    assert.equal(contextToVerify.input.path, appModel.metadata.filePath);
    assert.ok(contextToVerify.jobModel);
    assert.equal(contextToVerify.jobID, appModel._id);
    assert.ok(contextToVerify.logger);
    done();
  },

  'test_error': function(done) {
    var appModel = {
      fail: sandbox.stub(),
      toJSON: function() {}
    };

    var err = new Error('failed');

    mockAppMbaasModel.findOne.yields(err);
    appDataJob.start(appModel);
    assert.ok(appModel.fail.called);
    assert.equal(appModel.fail.args[0][0], err.message);
    done();
  }
};
