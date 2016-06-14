var assert = require('assert');
var deepequal=require('deep-equal');
var proxyquire = require('proxyquire');
var fixtures = require('../../fixtures');
var fhConfig = require('fh-config');
var mockgoose = require('mockgoose');
var mongoose = require('mongoose');
mockgoose(mongoose);
var sinon = require('sinon');
var _ = require('underscore');
var AppdataJobSchema = require('../../../lib/models/AppdataJobSchema');
fhConfig.setRawConfig(fixtures.config);

var modulePath = '../../../lib/middleware/appdata';
var middleware;
var jobFixture;
var models;

var appExportControllerMock = {
  startExport: sinon.stub()
    .callsArgWith(1, null, jobFixture)
};

var fakeUrl = { url: 'http://files.skunkhenry.com/storage/some-file.gz' };
var storageMock = {
  generateURL: sinon.stub()
    .callsArgWith(3, null, fakeUrl)
};


exports['middleware/appdata'] = {
  before: function(done) {
    mongoose.connect('test', function() {
      models = require('../../../lib/models');
      models.init(mongoose.connection, done);
    });
  },
  after: function(done) {
    mongoose.connection.close(done);
  },
  beforeEach: function(done) {
    // reset mocks
    middleware = proxyquire(modulePath, {
      '../models': models,
      '../export/appDataExportController': appExportControllerMock,
      './buildJobMiddleware': proxyquire('../../../lib/middleware/buildJobMiddleware', {
        '../../lib/storage': storageMock
      })
    });
    mockgoose.reset();

    // repopulate fixtures
    new models.AppdataJob(fixtures.appdata.createJob(1))
      .save(function(err, job) {
        jobFixture = job;
        done(err);
      });
  },
  '#find': {
    'should populate req.job': function(done) {
      var req = {};

      var next = function(err) {
        assert.equal(req.job.appid, jobFixture.appid);
        assert.ok(!err);
        done();
      };
      middleware.find(req, undefined, next, jobFixture._id);
    },
    'should return a 404 error when job not found': function(done) {
      var req = {};
      var next = function(err) {
        assert.equal(err.code, 404, err.message);
        done();
      };
      middleware.find(req, undefined, next, 'zzzzzzz');
    }
  },
  '#filteredJobs': {
    'should populate req.jobs': function(done) {
      var req = {};
      var params = {};
      params.appid = jobFixture.appid;
      params.environment = jobFixture.environment;
      req.params = params;
      var next = function(err) {
        assert.ok(!err);
        assert.equal(req.jobs[0].appid, jobFixture.appid);
        done();
      };
      middleware.filteredJobs(req, undefined, next);
    },
    'should return a 500 error on find() errors': function(done) {
      var req = {};
      var params = {};
      params.appid = jobFixture.appid;
      params.environment = jobFixture.environment;
      req.params = params;
      middleware = proxyquire(modulePath, {
        '../models': {
          AppdataJob: {
            find: sinon.stub().yields(new Error())
          }
        }
      });
      var next = function(err) {
        assert.equal(500, err.code);
        done();
      };
      middleware.filteredJobs(req, undefined, next);
    }
  },
  '#create': {
    beforeEach: function(done) {
      this.req = {
        params: {
          domain: 'domain',
          environment: 'environment',
          appid: 'appid'
        }
      };
      done();
    },
    'should delegate to appExportController': function(done) {
      var self = this;
      var next = function(err) {
        assert.ok(!err);
        assert.ok(appExportControllerMock.startExport.called, 'Export controller not invoked');
        assert.ok(appExportControllerMock.startExport.calledOnce);
        deepequal(self.req.job, jobFixture);
        done();
      };
      this.req.body = {
        stopApp: false
      };
      middleware.create(this.req, undefined, next);
    }
  },
  '#ensureFinishedAndRegistered': {
    beforeEach: function(done) {
      this.job = _.clone(jobFixture);
      this.job.status = AppdataJobSchema.statuses.FINISHED;
      this.job.metadata.fileId = 'some-id';
      this.req = { job: this.job };
      done();
    },
    'should error on incorrect status': function(done) {
      this.job.status = AppdataJobSchema.statuses.FAILED;
      var next = function(err) {
        assert.ok(err);
        assert.ok(/not finished/.test(err.message));
        done();
      };
      middleware.ensureFinishedAndRegistered(this.req, undefined, next);
    },
    'should error on fileId missing': function(done) {
      delete this.job.metadata.fileId;
      var next = function(err) {
        assert.ok(err);
        assert.ok(/no registered file/.test(err.message), err.message);
        done();
      };
      middleware.ensureFinishedAndRegistered(this.req, undefined, next);
    },
    'should error on file deleted': function(done) {
      this.job.metadata.fileDeleted = true;
      var next = function(err) {
        assert.ok(err);
        assert.ok(/deleted/.test(err.message), err.message);
        done();
      };
      middleware.ensureFinishedAndRegistered(this.req, undefined, next);
    }
  },
  '#generateURL': {
    before: function(done) {
      this.req = {
        job: {
          metadata: {
            fileId: 'some-id'
          }
        }
      };
      done();
    },
    'should delegate to storage': function(done) {
      var self = this;
      var next = function(err) {
        assert.ok(!err);
        assert.ok(storageMock.generateURL.calledOnce);
        assert.equal(self.req.fileUrl.url, fakeUrl.url);
        done();
      };
      middleware.generateURL(this.req, undefined, next);
    },
    'should 500 on error': function(done) {
      storageMock.generateURL = sinon.stub()
        .callsArgWith(3, new Error('test error'));
      var next = function(err) {
        assert.ok(err);
        assert.equal(err.code, 500);
        done();
      };
      middleware.generateURL(this.req, undefined, next);
    }
  }
};
