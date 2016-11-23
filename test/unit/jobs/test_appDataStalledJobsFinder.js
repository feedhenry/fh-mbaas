var setup = require('../../setup');
var proxyquire = require('proxyquire');
var assert = require('assert');
var sinon = require('sinon');

const MODULE_PATH = '../../../lib/jobs/appDataStalledJobsFinder';
var sandbox;
var mockAppdataJobModel;
var mockAgenda;
var jobToRun;
var stalledJobsFinder;

module.exports = {
  'before': function() {
    setup.setUp();
    sandbox = sinon.sandbox.create();
    mockAppdataJobModel = {
      stalledJobs: sandbox.stub()
    };
    mockAgenda = {
      define: sandbox.spy(function(name, opts, jobFunc) {
        jobToRun = jobFunc;
      }),
      every: sandbox.stub()
    };
    stalledJobsFinder = proxyquire(MODULE_PATH, {
      '../models': {
        AppdataJob: mockAppdataJobModel
      }
    });
  },

  'after': function() {
    sandbox.restore();
  },

  'test_stalled_jobs_finder_definition': function(done) {
    var opts = {
      frequency: 'every 1 minute'
    };
    stalledJobsFinder(mockAgenda, opts);
    assert.ok(mockAgenda.define.calledOnce);
    assert.ok(mockAgenda.every.calledOnce);
    assert.equal(opts.frequency, mockAgenda.every.args[0][0]);

    var mockJobs = [{
      fail: sandbox.stub()
    }];
    mockAppdataJobModel.stalledJobs.yields(null, mockJobs);
    mockJobs[0].fail.yields();

    var callback = sandbox.spy();
    jobToRun({}, callback);
    assert.ok(callback.calledOnce);
    assert.ok(mockAppdataJobModel.stalledJobs.calledOnce);
    assert.ok(mockJobs[0].fail.calledOnce);
    done();
  }
};