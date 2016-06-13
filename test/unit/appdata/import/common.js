const fhConfig = require('fh-config');
const EventEmitter = require('events').EventEmitter;

const TEST_IMPORT_FOLDER = '/test/import/folder';
const TEST_IMPORT_FILE = 'test_import_file.tar';

const TEST_OUTPUT_GZIPS = ['collection1.bson.gz', 'collection2.bson.gz', 'collection3.bson.gz', 'collection4.bson.gz'];
const TEST_OUTPUT_FILES = ['collection1.bson', 'collection2.bson', 'collection3.bson', 'collection4.bson'];

const contextBuilder = require('lib/jobs/context').contextBuilder;

fhConfig.setRawConfig({
  fhditch: {
    protocol: 'http',
    host: 'testing.feedhenry.me',
    port: '8802',
    service_key: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f'
  }
});

function createContext() {

  return contextBuilder()
    .withApplicationInfo(
      { guid: 'imtdbquweha2dq5etc7qrazv',
        env: 'dev'}
    )
    .withEventEmitter(new EventEmitter())
    .withCustomAtt('input', {
      path: TEST_IMPORT_FOLDER + '/' + TEST_IMPORT_FILE
    })
    .withJobModel({_id: {
      toString: function() {
        return '123';
      }
    }})
    .build();
}

module.exports.createContext = createContext;
module.exports.TEST_IMPORT_FOLDER = TEST_IMPORT_FOLDER;
module.exports.TEST_IMPORT_FILE = TEST_IMPORT_FILE;
module.exports.TEST_OUTPUT_FILES = TEST_OUTPUT_FILES;
module.exports.TEST_OUTPUT_GZIPS = TEST_OUTPUT_GZIPS;