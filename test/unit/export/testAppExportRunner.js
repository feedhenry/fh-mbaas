var fhConfig = require('fh-config');
var proxyquire =  require('proxyquire');
var sinon = require('sinon');

const STATUS_EVENT = require('lib/jobs/progressPublisher').STATUS_EVENT;
const PROGRESS_EVENT = require('lib/jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;

fhConfig.setRawConfig({
  fhditch: {
    protocol: 'http',
    host: 'testing.feedhenry.me',
    port: '8802',
    service_key: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f'
  }
});

var assert = require('assert');
var sinon = require('sinon');
var mongoMocks = require('../../stubs/mongo/mongoMocks');

////////////// DITCH MOCK

const MOCK_DB_URL = 'mongodb://user:pass@host:port:dbName';

var mongo = mongoMocks([{name:'a', size:1024}, {name:'b', size:2048}]);

var ditchHelperStub = {
  getAppInfo: function(appName, cb) {

    mongo.MongoClient.dbMock.collectionNames(function (err, names) {
      cb(null, {uri: MOCK_DB_URL, collections: names});
    })
  }
}

////////////// FS MOCK
var fsMock = {
  mkdir: function(path, cb) {
    cb();
  }
}


var AppExportRunner = proxyquire('lib/export/AppExportRunner',
  { 'mongodb': mongo, '../util/ditchhelper': ditchHelperStub , 'fs': fsMock}).AppExportRunner;

module.exports.test_persisting = function(done) {

  var mockAppInfo = {
    set: sinon.stub(),
    save: function(cb) {
      cb();
    },
    toJSON: function () {
      return {
        status: status
      }
    },
    reset: function() {
      this.set.reset();
      this.save.reset();
    },
    status: null,
    progress: null,
    appName: 'testApp',
    appEnv: 'testAppEnv',
    appGuid: '01234567890'
  };

  var exportJobMock = {
    fileSize: null,
    save: function(cb) {
      cb();
    }
  };

  sinon.stub(mongo.MongoClient, 'connect', mongo.MongoClient.connect);
  sinon.stub(ditchHelperStub, 'getAppInfo', ditchHelperStub.getAppInfo);
  sinon.stub(fsMock, 'mkdir', fsMock.mkdir);

  var appExportRunner = new AppExportRunner('JOBID', mockAppInfo, exportJobMock, '/tmp');

  appExportRunner.on(FINISH_EVENT, function() {
    assert.ok(mongo.MongoClient.connect.called);
    assert.ok(mongo.MongoClient.connect.calledOnce);
    assert.equal(mongo.MongoClient.connect.args[0][0], MOCK_DB_URL);
    assert.ok(ditchHelperStub.getAppInfo.called);
    assert.ok(ditchHelperStub.getAppInfo.calledOnce);
    assert.equal(ditchHelperStub.getAppInfo.args[0][0], mockAppInfo.appName);

    assert.equal(exportJobMock.fileSize, 3072);

    assert.ok(fsMock.mkdir.called);
    assert.ok(fsMock.mkdir.calledOnce);
    assert.equal(fsMock.mkdir.args[0][0], '/tmp/01234567890/testAppEnv/JOBID');

    done();
  }).on(FAIL_EVENT, function(errorMessage) {
    done(errorMessage);
  });

  appExportRunner.run();
}