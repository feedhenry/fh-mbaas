const assert = require('assert');
const path = require('path');
const proxyquire = require('proxyquire');
const fhConfig = require('fh-config');
const mockgoose = require('mockgoose');
const mongoose = require('mongoose');
mockgoose(mongoose);
const fixtures = require('../../fixtures');
fhConfig.setRawConfig(fixtures.config);

// must be an absolute path
var testPath = path.resolve(__dirname, '../../../README.md');

var models;
var storage;

function createModel(done) {
  var self = this;
  storage.registerFile(testPath, function(err, model) {
    self.model = model;
    done(err);
  });
}

exports['storage'] = {
  before: function(done) {
    mongoose.connect('test', function() {
      models = require('../../../lib/storage/models/FileSchema');
      models.createModel(mongoose.connection);
      storage = proxyquire('../../../lib/storage', {
        './models/FileSchema': models
      });
      done();
    });
  },
  after: function(done) {
    mongoose.connection.close(done);
  },
  '#registerFile': {
    'should register new file': function(done) {
      storage.registerFile(testPath, function(err, model) {
        assert.ok(!err);
        assert.equal(model.fileName, path.basename(testPath));
        done();
      });
    },
    'should validate file existance': function(done) {
      var path = '/doesnt/exist.txt';
      storage.registerFile(path, function(err) {
        assert.ok(err);
        done();
      });
    },
    'should not accept folders': function(done) {
      var p = path.resolve(__dirname, '../');
      storage.registerFile(p, function(err) {
        assert.ok(err && /file/.test(err.message));
        done();
      });
    },
    'should not accept relative paths': function(done) {
      var p = '../';
      storage.registerFile(p, function(err) {
        assert.ok(err && /absolute/.test(err.message));
        done();
      });
    }
  },
  '#getFileDetails': {
    before: createModel,
    'should return existing model': function(done) {
      var self = this;
      storage.getFileDetails(self.model._id, function(err, model) {
        assert.equal(self.model.filename, model.filename);
        done();
      });
    },
    'should error on non-existing id': function(done) {
      storage.getFileDetails('123', function(err) {
        assert.ok(err && /id/.test(err.message));
        done();
      });
    }
  },
  '#generateURL': {
    before: createModel,
    'should generate a url for download': function(done) {
      var self = this;
      storage.generateURL(this.model._id, null, 600, function(err, urlObj) {
        assert.ok(!err);
        assert.ok((new RegExp(self.model._id)).test(urlObj.url));
        done();
      });
    }
  }
};
