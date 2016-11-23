var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
mockgoose(mongoose);
var async = require('async');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var assert = require('assert');

var fhConfig = require('fh-config');

fhConfig.setRawConfig({
  fhditch: {
    protocol: 'http',
    host: 'testing.feedhenry.me',
    port: '8802',
    service_key: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f'
  },
  fhmbaas: {
    appdataexport: {
      default_lock_lifetime: 15000,
      output_dir: "/var/feedhenry/data",
      schedule_time: 30000,
      cleaner: {
        frequency: "*/1 * * * *",
        grace_time: 10
      }
    }
  }
});


mongoose.connect('mongodb://localhost/myapp');

var ExportJobModule = require('lib/models/index');

ExportJobModule.init(mongoose, function(err) {});

var ExportJob = require('lib/models/index').AppdataJob;
var FileStore = require('lib/models/index').File;


var fsMock = {
  unlink: sinon.spy(function (path, cb) {
    cb();
  }),
  exists: function(path, cb) {
    cb(true);
  },
  stat: sinon.spy(function(path, cb) {
    cb();
  })
};

var rimrafMock = sinon.spy(function(path, cb) {
  cb();
});

var storageMock = {
  deleteFile: function(fileId, cb) {
    cb();
  }
};

var Cleaner = proxyquire('lib/export/cleaner/appDataExportCleanerRunner',
  {'fs': fsMock,
    '../../storage/index': storageMock,
    'rimraf': rimrafMock}
  ).AppDataExportCleanerRunner;

const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;
const ProgressPublisher = require('lib/jobs/progressPublisher').ProgressPublisher;

var TaggedLogger = new require('lib/jobs/taggedLogger').TaggedLogger;
var logger = new TaggedLogger(fhConfig.getLogger(), '[APPDATAEXPORT CLEANER TEST]');

function createExportJob(exportJobFixture, cb) {
  var ej = new ExportJob();
  ej.jobType='export';
  ej.id = exportJobFixture.id;
  ej.created = exportJobFixture.created;
  ej.domain = exportJobFixture.domain;
  ej.environment = exportJobFixture.environment;
  ej.appid = exportJobFixture.appid;
  ej.status = exportJobFixture.status;
  ej.metadata = {};
  ej.updateMetadata('fileId', exportJobFixture.metadata.fileId);
  ej.updateMetadata('filePath', exportJobFixture.metadata.filePath);

  ej.save(function (err) {
    cb(err);
  });
}

function createFileStore(fileStoreFixture, cb) {
  var filestore = new FileStore();
  filestore.created = fileStoreFixture.created;
  filestore.directory = fileStoreFixture.directory;
  filestore.fileName = fileStoreFixture.fileName;
  filestore.host = fileStoreFixture.host;
  filestore.size = fileStoreFixture.size;
  filestore.save(cb);
}

function initdb(cb) {

  var exportData = require('test/fixtures/appdata/export/exportjobs.json');
  var fileStore = require('test/fixtures/appdata/export/filestore.json');

  async.parallel([
    async.apply(async.each, exportData, createExportJob),
    async.apply(async.each, fileStore, createFileStore)
  ], function (err) {
    cb(err);
  });
}

function fileStoreStatus(id, exists, cb) {
  FileStore.find({id: id}, function (err, filestore) {
    if (err) {
      return cb(err);
    }

    if (filestore && filestore.length > 0 && !exists) {
      return cb('Filestore ' + id + ' exists');
    }

    if ((!filestore || filestore.length == 0) && exists) {
      return cb('Filestore ' + id + ' does not exists');
    }
    return cb();
  })
}
function dropCollections(cb) {
  if (mongoose.connection.collections.appdatajobs) {
    mongoose.connection.collections['appdatajobs'].drop(function (err) {
      console.log('Collection dropped');
      cb(err);
    });
  }
}

function closeConnection(cb) {
  mongoose.connection.close(cb);
}

module.exports.test_export_cleaner = function(done) {
  mockgoose.reset();
  async.series([
    initdb
  ], function(err) {
    if (err) {
      return done(err);
    }

    // Mockgoose seems to have problem with '$and' at the root of the query.
    // In the test lets override the query by removing that and filter.
    var olderThanDate = new Date();
    olderThanDate.setDate(olderThanDate.getDate() - 10);
    query = { created: {$lte: olderThanDate }, $or: [ {status: 'complete'}, {status: 'failed'}] };

    var context = {
      logger: logger,
      query: query
    };

    var cleaner = new Cleaner(context);

    cleaner.on(FINISH_EVENT, function() {

      assert.ok(rimrafMock.called);
      assert.ok(rimrafMock.callCount >= 3 , 'Should be called at least 3 times');

      async.series([
        initdb,
        closeConnection
      ], function(err) {
        done(err);
      });
    });

    cleaner.on(FAIL_EVENT, function(message) {
      done(message);
    });

    var publisherFunction = function(message) {
      logger.info ('EVENT:', message);
    };

    // We do not want to make 'batch' update, so we persist each received message: queue size = 1
    var progressPublisher = new ProgressPublisher(1, publisherFunction);
    progressPublisher.listen(cleaner);

    cleaner.run();
  });
};
