var setup = require('../../setup');
var proxyquire = require('proxyquire');
var assert = require('assert');
var sinon = require('sinon');

const MODULE_PATH = '../../../lib/jobs/appDataRunnerJob';
var sandbox;
var mockAppdataJobModel;
var mockAppData;
var mockAgenda;
var jobToRun;
var appDataRunnerJob;
module.exports = {
  'before': function() {
    setup.setUp();
    sandbox = sinon.sandbox.create();
    mockAppdataJobModel = {
      runningJobs: sandbox.stub(),
      findNextJob: sandbox.stub()
    };
    mockAppData = {
      start: sandbox.stub()
    };
    mockAgenda = {
      define: sandbox.spy(function(name, opts, jobFunc) {
        jobToRun = jobFunc;
      }),
      every: sandbox.stub()
    };
    appDataRunnerJob = proxyquire(MODULE_PATH, {
      '../models': {
        AppdataJob: mockAppdataJobModel
      },
      './appDataJob': mockAppData
    });
  },

  'after': function() {
    sandbox.restore();
  },

  'test_appdata_scheduler_job_definition': function(done) {
    var opts = {
      frequency: 'every 10 seconds',
      concurrency: 2
    };
    appDataRunnerJob(mockAgenda, opts);
    assert.ok(mockAgenda.define.calledOnce);
    assert.ok(mockAgenda.every.calledOnce);
    assert.equal(opts.frequency, mockAgenda.every.args[0][0]);

    //if there are current running jobs and reaches the concurrency limit,
    //no new jobs should be running
    var jobs = [{id: 'job1'}, {id:'job2'}];
    mockAppdataJobModel.runningJobs.yields(null, jobs);

    var callback = sandbox.spy();
    jobToRun({}, callback);
    assert.ok(callback.called);
    assert.equal(0, mockAppdataJobModel.findNextJob.callCount);

    callback.reset();
    jobs = [{id:'job3'}];
    mockAppdataJobModel.runningJobs.yields(null, jobs);
    var nextJob = {
      id: 'job4',
      checkCurrentState: sandbox.stub(),
      readyToProceed: sandbox.stub()
    };
    nextJob.checkCurrentState.yields();
    nextJob.readyToProceed.returns(true);
    mockAppdataJobModel.findNextJob.yields(null, [nextJob]);
    jobToRun({}, callback);
    assert.ok(callback.calledOnce);
    assert.ok(mockAppdataJobModel.findNextJob.calledOnce);

    setTimeout(function() {
      assert.ok(mockAppData.start.calledOnce);
      assert.ok(mockAppData.start.calledWith(nextJob));
      done();
    }, 1);
  }
};