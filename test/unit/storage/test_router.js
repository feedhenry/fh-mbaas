const mockgoose = require('mockgoose');
const mongoose = require('mongoose');
mockgoose(mongoose);
const proxyquire = require('proxyquire');
const express = require('express');
const fhConfig = require('fh-config');
const fixtures = require('../../fixtures');
const path = require('path');
const url = require('url');
const supertest = require('supertest');
fhConfig.setRawConfig(fixtures.config);

var router;
var storage;
var models;
var app;

var FAKE_JOB_ID;

// must be an absolute path
var testPath = path.resolve(__dirname, '../../../README.md');

// Create a dummy import job to allow file uploads
// (import jobs are created before the upload has finished)
function createFakeJob(Model, cb) {
  var job = new Model();
  job.jobType = "import";
  job.domain = "testing";
  job.environment = 'dev';
  job.appid = "ad7eykyyaqpcei52a5owfi2a";
  job.metadata = {
    fileSize: 1024,
    filePath: "/tmp",
    uploadFinished: false
  };
  job.save(cb);
}

// All call-through
var mockRouter = {};

exports['storage#router'] = {
  before: function(done) {
    mongoose.connect('test', function() {
      models = require('../../../lib/models');
      models.init(mongoose.connection, function () {
        storage = proxyquire('../../../lib/storage', {
          './models/FileSchema': models,

          // This seems to be required for the router to pick up the mocked fhConfig
          './impl/router.js': proxyquire('../../../lib/storage/impl/router', mockRouter)
        });

        router = storage.router;
        app = express();
        app.use('/api/storage/', router);

        createFakeJob(models.AppdataJob, function (err, job) {
          FAKE_JOB_ID = job._id;
          done();
        });
      });
    });
  },
  after: function(done) {
    mongoose.connection.close(done);
  },
  'GET /api/storage/:resourceId': {
    before: function(done) {
      // register test file
      var self = this;

      storage.registerFile(testPath, function(err, model) {
        self.file = model;
        storage.generateURL(model._id, null, 600, function(err, urlObj) {
          self.url = url.parse(urlObj.url).path;
          storage.generateURL(model._id, FAKE_JOB_ID, 600, function (err, uploadUrlObj) {
            self.uploadUrl = url.parse(uploadUrlObj.url).path;
            done();
          });
        });
      });
    },
    'should supply a file download': function(done) {
      supertest(app)
        .get(this.url)
        .expect(200)
        .expect('Content-Type', /octet-stream/)
        .expect('Content-Disposition', new RegExp(path.basename(testPath)))
        .end(done);
    },
    'file uploads should work': function(done) {
      var location = 'test/fixtures/appdata/import/export.tar';
      supertest(app)
        .post(this.uploadUrl)
        .attach('file', location)
        .expect(200)
        .end(done);
    },
    'should 404 on invalid file resource': function(done) {
      var parsed = url.parse(this.url);
      parsed.pathname = path.resolve(parsed.pathname, "../non-existant-file");
      var fakeUrl = url.format(parsed);

      supertest(app)
        .get(fakeUrl)
        .expect(404)
        .end(done);
    },
    'should 401 on invalid token': function(done) {
      var parsed = url.parse(this.url);
      parsed.search = '?token=invalid';
      var fakeUrl = url.format(parsed);

      supertest(app)
        .get(fakeUrl)
        .expect(401)
        .end(done);
    }
  }
};
