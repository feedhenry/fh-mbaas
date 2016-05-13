const mockgoose = require('mockgoose');
const mongoose = require('mongoose');
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

// must be an absolute path
var testPath = path.resolve(__dirname, '../../../README.md');

exports['storage#router'] = {
  before: function(done) {
    mockgoose(mongoose).then(function() {
      mongoose.connect('test', function() {
        models = require('../../../lib/storage/models/FileSchema');
        models.createModel(mongoose.connection);
        storage = proxyquire('../../../lib/storage', {
          './models/FileSchema': models
        });

        router = storage.router;
        app = express();
        app.use('/api/storage/', router);

        done();
      });
    });
  },
  'GET /api/storage/:resourceId': {
    before: function(done) {
      // register test file
      var self = this;
      storage.registerFile(testPath, function(err, model) {
        self.file = model;
        storage.generateURL(model._id, 600, function(err, urlObj) {
          self.url = url.parse(urlObj.url).path;
          done();
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