const fhconfig = require('fh-config');
fhconfig.setRawConfig({});

const path = require('path');
const assert = require('assert');

const createContext = require('./common').createContext;

const TEST_IMPORT_FOLDER = require('./common').TEST_IMPORT_FOLDER;
const TEST_OUTPUT_GZIPS = require('./common').TEST_OUTPUT_GZIPS;
const TEST_IMPORT_FILE = require('./common').TEST_IMPORT_FILE;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mongoose = require('mongoose');
const mockgoose = require('mockgoose');
const _ = require('underscore');

mockgoose(mongoose);

const models = require('fh-mbaas-middleware').models;

models.init({mongoUrl: 'dummyurl'}, function() {

});


function resetDatabase(cb) {
  mockgoose.reset();
  var AppMbaasModel = models.getModels().AppMbaas;

  var app = new AppMbaasModel(
    {
      accessKey : '5723913f3b263ee13207211a',
      apiKey : 'fce3f01c631c2b001758e0f9a533016d72d90775',
      coreHost : 'https://testing.feedhenry.me',
      dbConf : {
        pass : 'amRSIyORlHJbob',
        user : 'auaf5Gl8AyGBYb',
        name : 'testing-imtdbquweha2dq5etc7qrazv-dev',
        port : 27017,
        host : 'node1.feedhenry.local'
      },
      domain : 'testing',
      environment : 'dev',
      guid : 'imtdbquweha2dq5etc7qrazv',
      isServiceApp : false,
      mbaasUrl : 'https://mbaas.feedhenry.me/',
      migrated : true,
      name : 'testing-imtdbquweha2dq5etc7qrazv-dev',
      type : 'feedhenry',
      url : 'https://testing-imtdbquweha2dq5etc7qrazv-dev.feedhenry.me'
    }
  );

  app.save(function(err) {
    cb(err);
  });
}

var commonsMock = {
  extractTarFile: sinon.spy(function(context, cb) {
    context.input.folder = TEST_IMPORT_FOLDER;
    cb(null, context);
  }),
  gunzip: sinon.spy(function gunzip(folder, file, cb) {
    var outFile = file.slice(0, -3);
    cb(null, outFile);
  })
};

var fsStub = {
  readdir: function(folder, cb) {
    var ary = TEST_OUTPUT_GZIPS.slice(0);
    ary.push(path.basename(TEST_IMPORT_FILE));
    cb(null, ary);
  },
  unlink: sinon.spy(function(path, cb) {
    cb(null);
  })
};

module.exports.test_app_data_import_preparation_steps = function(done) {
  resetDatabase(function() {
    var context = createContext();

    const prepareForImport = proxyquire('lib/appdata/import/preparationSteps',
      { '../shared/common': commonsMock,
        'fs': fsStub
      }).prepareForImport;

    prepareForImport(context, function(err) {
      if (err) {
        return done(err);
      }

      assert.ok(commonsMock.extractTarFile.calledOnce);

      assert.equal(commonsMock.gunzip.callCount, 4);

      _.each(commonsMock.gunzip.getCalls(), function(call, index) {
        assert.equal(call.args[0], TEST_IMPORT_FOLDER);
        assert.equal(call.args[1], TEST_OUTPUT_GZIPS[index]);
      });

      assert.equal(fsStub.unlink.callCount, 4);

      _.each(fsStub.unlink.getCalls(), function(call, index) {
        assert.equal(call.args[0], TEST_IMPORT_FOLDER + '/' + TEST_OUTPUT_GZIPS[index]);
      });

      assert.equal(context.output.folder, TEST_IMPORT_FOLDER);
      assert.equal(context.output.folder, TEST_IMPORT_FOLDER);

      _.each(context.output.files, function(file, index) {
        assert.equal(file, TEST_OUTPUT_GZIPS[index].slice(0,-3));
      });

      // we don't perform import steps
      assert.equal(context.progress.current, context.progress.total - TEST_OUTPUT_GZIPS.length);

      done(err);
    });
  });
};