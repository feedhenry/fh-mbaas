const proxyquire =  require('proxyquire');
const sinon =  require('sinon');
const assert = require('assert');
const _ = require('underscore');

const fhConfig = require('fh-config');

const createContext = require('./common').createContext;
const TEST_IMPORT_FOLDER = require('./common').TEST_IMPORT_FOLDER;
const TEST_OUTPUT_FILES = require('./common').TEST_OUTPUT_FILES;


var preparationStepsMock= {
  appInfo: undefined,
  prepareForImport: sinon.spy(function(context, cb) {
    context.input.folder = TEST_IMPORT_FOLDER;
    context.appInfo = preparationStepsMock.appInfo;
    context.input.progress = {
      total: TEST_OUTPUT_FILES.length * 2,
      // we simulate files has already been extracted
      current: TEST_OUTPUT_FILES.length
    };
    context.output = {
      folder: context.input.folder,
      files: TEST_OUTPUT_FILES
    };
    if (context.appInfo) {
      if (context.appInfo.dbConf) {
        return cb(null, context);
      } else {
        return cb('Specified app has not been upgraded yet', context);
      }
    } else {
      return cb('Specified app could not be found', context);
    }
  })
};

var mongoImportMock = {
  mongoImport: sinon.spy(function(host, port, database, filename, cb) {
    cb();
  })
};

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

module.exports.aatest_app_data_import_runner = function(done) {
  preparationStepsMock.appInfo = {
    _id : '5723913f3b263ee13207211b',
    id : '5723913f3b263ee13207211b',
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
  };

  const AppDataImportRunner = proxyquire(
    'lib/appdata/import/appDataImportRunner',
    {'./preparationSteps': preparationStepsMock,
      './appDataImport': mongoImportMock}).AppDataImportRunner;

  var context = createContext();

  var appDataImportRunner = new AppDataImportRunner(context)
    .on(FINISH_EVENT, function() {
      assert.equal(context.input.progress.current, context.input.progress.total);
      assert.equal(mongoImportMock.mongoImport.callCount, TEST_OUTPUT_FILES.length);
      assert.equal(_.difference(mongoImportMock.mongoImport.getCall(0).args.slice(0, -1), ['node1.feedhenry.local',27017,'testing-imtdbquweha2dq5etc7qrazv-dev','collection1.bson']), 0);
      assert.equal(_.difference(mongoImportMock.mongoImport.getCall(1).args.slice(0, -1), ['node1.feedhenry.local',27017,'testing-imtdbquweha2dq5etc7qrazv-dev','collection2.bson']), 0);
      assert.equal(_.difference(mongoImportMock.mongoImport.getCall(2).args.slice(0, -1), ['node1.feedhenry.local',27017,'testing-imtdbquweha2dq5etc7qrazv-dev','collection3.bson']), 0);
      assert.equal(_.difference(mongoImportMock.mongoImport.getCall(3).args.slice(0, -1), ['node1.feedhenry.local',27017,'testing-imtdbquweha2dq5etc7qrazv-dev','collection4.bson']), 0);
      done();
    })
    .on(FAIL_EVENT, function(message) {
      done(message);
    });
  appDataImportRunner.run();

};


module.exports.aatest_app_data_import_app_not_found = function(done) {
  preparationStepsMock.appInfo = undefined;
  const AppDataImportRunner = proxyquire(
    'lib/appdata/import/appDataImportRunner',
    {'./preparationSteps': preparationStepsMock,
      './appDataImport': mongoImportMock}).AppDataImportRunner;

  var context = createContext();

  var appDataImportRunner = new AppDataImportRunner(context)
    .on(FINISH_EVENT, function() {
      done('Import should have failed');
    })
    .on(FAIL_EVENT, function(message) {
      assert.equal('Specified app could not be found', message);
      done();
    });

  appDataImportRunner.run();
};