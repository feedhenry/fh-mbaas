var supertest = require('supertest');
var proxyquire = require('proxyquire');
var fixtures = require('../../../fixtures');
var fhConfig = require('fh-config');
var sinon = require('sinon');
var assert = require('assert');
var express = require('express');
fhConfig.setRawConfig(fixtures.config);
var jobMocks = [{
  id: 'id',
  type: 'export'
}, {
  id: 'id2',
  type: 'export'
}];

var fakeUrl = 'http://example.com/file.tar';

var mockMiddleware = {
  find: sinon.spy(function(req, res, next, jobId) {
    req.job = jobMocks[0];
    next();
  }),
  filteredJobs: function(req, res, next) {
    req.jobs = jobMocks;
    next();
  },
  create: function(req, res, next) {
    req.job = jobMocks[1];
    next();
  },
  ensureFinishedAndRegistered: sinon.spy(function(req, res, next) {
    next();
  }),
  generateURL: sinon.spy(function(req, res, next) {
    req.fileUrl = fakeUrl;
    next();
  })
};

exports['handlers/export.js'] = {
  before: function(done) {
    var router = proxyquire('../../../../lib/routes/forms/submissions/handlers/export', {
      '../../../../middleware/buildJobMiddleware': function() {
        return mockMiddleware;
      }
    });
    var app = express();

    this.app = app;
    app.use(router);
    done();
  },
  'GET export/': {
    'should return all jobs': function(done) {
      supertest(this.app)
        .get('/export')
        .expect('Content-Type', /json/)
        .expect(200, jobMocks, done);
    }
  },
  'GET export/:id': {
    'should return a single job by id': function(done) {
      supertest(this.app)
        .get('/export/123')
        .expect(function() {
          // called with correct Id
          mockMiddleware.find.calledWith(sinon.match.object,
            sinon.match.object,
            sinon.match.function,
            '123');
        })
        .expect(200, jobMocks[0], done);
    }
  },
  'POST export/': {
    'should create a job by invoking the runner function': function(done) {
      supertest(this.app)
        .post('/export')
        .expect(200, jobMocks[1], done);
    }
  },
  'POST export/:id': {
    'should return a file download uri': function(done) {
      supertest(this.app)
        .post('/export/123')
        .expect(function() {
          assert.ok(mockMiddleware.ensureFinishedAndRegistered.called);
          assert.ok(mockMiddleware.generateURL.called);
        })
        .expect(200, fakeUrl, done);
    }
  }
};