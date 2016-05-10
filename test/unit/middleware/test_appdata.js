var assert = require('assert');
var proxyquire = require('proxyquire');
var fixtures = require('../../fixtures');
var fhConfig = require('fh-config');
var mockgoose = require('mockgoose');
var mongoose = require('mongoose');
var sinon = require('sinon');
fhConfig.setRawConfig(fixtures.config);

var modulePath = '../../../lib/middleware/appdata';
var middleware;
var jobFixture;
var models;

exports['middleware/appdata'] = {
  before: function(done) {
    mockgoose(mongoose);
    mongoose.connect('test', function() {
      models = require('../../../lib/models');
      models.init(mongoose.connection, done);
    });
  },
  beforeEach: function(done) {
    // reset mocks
    middleware = proxyquire(modulePath, {
      '../models': models
    });
    mockgoose.reset();

    // repopulate fixtures
    new models.ExportJob(fixtures.appdata.createJob(1))
      .save(function(err, job) {
        jobFixture = job;
        done(err);
      });
  },
  '#findJob': {
    'should populate req.job': function(done) {
      var req = {};

      var next = function(err) {
        assert.equal(req.job.appid, jobFixture.appid);
        assert.ok(!err);
        done();
      };
      middleware.findJob(req, undefined, next, jobFixture._id);
    },
    'should return a 404 error when job not found': function(done) {
      var req = {};
      var next = function(err) {
        assert.equal(err.code, 404, err.message);
        done();
      };
      middleware.findJob(req, undefined, next, 123);
    }
  },
  '#allJobs': {
    'should populate req.jobs': function(done) {
      var req = {};
      var next = function(err) {
        assert.ok(!err);
        assert.equal(req.jobs[0].appid, jobFixture.appid);
        done();
      };
      middleware.allJobs(req, undefined, next);
    },
    'should return a 500 error on find() errors': function(done) {
      var req = {};
      middleware = proxyquire(modulePath, {
        '../models': {
          ExportJob: {
            find: sinon.stub().yields(new Error())
          }
        }
      });
      var next = function(err) {
        assert.equal(500, err.code);
        done();
      };
      middleware.allJobs(req, undefined, next);
    }
  },
  '#createJob': {
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
    'should populate req.job with new job with [domain, environment, appid]': function(done) {
      var self = this;
      var next = function(err) {
        assert.ok(!err);
        assert.equal('domain', self.req.job.domain);
        assert.equal('environment', self.req.job.environment);
        assert.equal('appid', self.req.job.appid);
        done();
      };
      middleware.createJob(this.req, undefined, next);
    },
    'should return 400 on a ValidationError': function(done) {
      delete this.req.appid;
      var next = function(err) {
        assert.equal(err.code, 400);
      };
      middleware.createJob(this.req, undefined, next);
      done();
    }
  },
  '#registerFile': {
    beforeEach: function(done) {
      this.req = { job: jobFixture };
      done();
    },
    'should populate fileId': function(done) {
      var self = this;
      var next = function(err) {
        assert.ok(!err);
        assert.ok(self.req.fileId);
        done();
      };
      middleware.registerFile(this.req, undefined, next);
    },
    'should return 404 on a deleted file': function(done) {
      this.req.job.fileDeleted = true;
      var next = function(err) {
        assert.equal(err.code, 404);
        done();
      };
      middleware.registerFile(this.req, undefined, next);
    }
  }
};