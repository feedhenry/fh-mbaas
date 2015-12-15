var sinon = require('sinon');
var proxyquire = require('proxyquire');
var assert = require('assert');
var stubs = require('../../../stubs');
var fixtures = require('../../../fixtures');
var fhConfig = require('fh-config');
fhConfig.setRawConfig(fixtures.config);
var logger = fhConfig.getLogger();

var mockLogger = {
  getLogger: function(){
    return {
      logger: logger
    };
  }
};

module.exports = {
  "It Should Update Data Source Cache No Error": function (done) {
    var mockDSWithData = fixtures.forms.dataSources.withData();
    var mockDSData = mockDSWithData.data;
    var mockMongoUrl = fixtures.envConfig().dbConf.expectedMongoUrl;

    var updateCacheStub = stubs.forms.core.dataSources.updateCache();

    var mocks = {
      'fh-forms': {
        core: {
          dataSources: {
            updateCache: updateCacheStub
          }
        }
      },
      '../logger': mockLogger
    };

    var updateDataSourceCache = proxyquire('../../../../lib/dataSourceUpdater/lib/handlers/updateDataSourceCache', mocks);

    updateDataSourceCache({
      currentTime: new Date(),
      mongoUrl: mockMongoUrl,
      data: mockDSData,
      dataSourceId: mockDSWithData._id
    }, function (err, updatedDataSource) {
      assert.ok(!err, "Expected No Error");

      assert.equal(updatedDataSource._id, mockDSWithData._id);
      assert.equal(updatedDataSource.data[0].key, mockDSData[0].key);
      sinon.assert.calledOnce(updateCacheStub);

      done();
    });
  },
  "It Should Update Data Source Cache With Error": function (done) {
    var mockDSWithError = fixtures.forms.dataSources.withError();
    var mockDSError = mockDSWithError.currentStatus.error;
    var mockMongoUrl = fixtures.envConfig().dbConf.expectedMongoUrl;

    var updateCacheStub = stubs.forms.core.dataSources.updateCache();

    var mocks = {
      'fh-forms': {
        core: {
          dataSources: {
            updateCache: updateCacheStub
          }
        }
      },
      '../logger': mockLogger
    };

    var updateDataSourceCache = proxyquire('../../../../lib/dataSourceUpdater/lib/handlers/updateDataSourceCache', mocks);

    updateDataSourceCache({
      currentTime: new Date(),
      mongoUrl: mockMongoUrl,
      error: mockDSError,
      dataSourceId: mockDSWithError._id
    }, function (err, updatedDataSource) {
      assert.ok(!err, "Expected No Error");

      assert.equal(updatedDataSource._id, mockDSWithError._id);
      assert.equal(updatedDataSource.data, undefined);
      assert.equal(updatedDataSource.currentStatus.status, "error");
      assert.equal(updatedDataSource.currentStatus.error.code, "DS_ERROR");
      sinon.assert.calledOnce(updateCacheStub);

      done();
    });
  }
};