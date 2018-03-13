var mongoose = require('mongoose');
var assert = require('assert');
var Mockgoose = require('mockgoose').Mockgoose;
var async = require('async');

var fixtures = require('../../fixtures');
var mockgoose = new Mockgoose(mongoose);
mockgoose.helper.setDbVersion("3.2.10");

var models = require('lib/models');


describe('Submission Export Job Model', function(){

  before(function(done){
    mockgoose.prepareStorage().then(() => {
      mongoose.connect('mongodb://example.com/TestingDB', function(err) {
        done(err);
      });
    });
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  beforeEach(function(done){
    mockgoose.helper.reset();

    models.init(mongoose.connection, done);
  });

  it("Initialise Submission Export Model", function(done){
    var mockSubmissionExportJobData = {
      domain: fixtures.mockDomain,
      environment: fixtures.mockEnv,
      jobType: "export",
      totalSteps: 22,
      metaData: {
        submissions: 22,
        files: 222,
        size: 213432
      },
      logs: ["This is a log"],
      junk: "THIS SHOULD NOT BE HERE."
    };

    async.waterfall([
      function createAndSaveModel(cb){
        assert.ok(models.SubmissionExportJob, "Expected a submission export job to be defined");
        //Create a mock submission export Job

        var newSubmissionExportJob = new models.SubmissionExportJob(mockSubmissionExportJobData);


        newSubmissionExportJob.save(function(err, savedJob){
          assert.ok(!err, "Expected no error " + err);

          assert.ok(savedJob, "Expected A Saved Job");
          assert.ok(savedJob._id, "Expected the saved job to have an _id parameter");

          cb(undefined, savedJob);
        });
      },
      function checkModelSaved(savedJob, cb){
        models.SubmissionExportJob.findOne({_id: savedJob._id}, function(err, foundJob){
          assert.ok(!err, "Expected no error " + err);

          assert.ok(foundJob, "Expected A Job");
          assert.equal(mockSubmissionExportJobData.domain, foundJob.domain);
          assert.equal(mockSubmissionExportJobData.environment, foundJob.environment);
          assert.equal(mockSubmissionExportJobData.jobType, "export");
          assert.equal(mockSubmissionExportJobData.totalSteps, foundJob.totalSteps);
          assert.equal(mockSubmissionExportJobData.logs[0], foundJob.logs[0]);
          assert.equal(mockSubmissionExportJobData.metaData.submissions, mockSubmissionExportJobData.metaData.submissions);
          assert.equal(undefined, foundJob.junk);
          cb();
        });
      }
    ], function(err){
      assert.ok(!err, "Expected No Error " + err);
      done();
    });
  });

});