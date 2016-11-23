var sinon = require('sinon');
var proxyquire = require('proxyquire');
var assert = require('assert');
var fixtures = require('../../../fixtures');
var stubs = require('../../../stubs');
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
  "It Should Process Data Sources For An Environment": function(done){
    var mockEnvConfig = fixtures.envConfig();
    var currentTime = new Date();

    var dsListForUpdate = stubs.services.appForms.dataSources.listForUpdate();
    var listDeployedServices = stubs.services.appmbaas.listDeployedServices();

    var updateSingleDataSourceStub = stubs.dataSourceUpdater.handlers.updateSingleDataSource(false);

    var mocks = {
      '../../../services/appForms/dataSources': {
        listForUpdate: dsListForUpdate
      },
      './updateSingleDataSource': updateSingleDataSourceStub,
      '../../../services/appmbaas/listDeployedServices': listDeployedServices,
      '../logger': mockLogger
    };

    var processEnvDataSources = proxyquire('../../../../lib/dataSourceUpdater/lib/handlers/processEnvDataSources', mocks);

    processEnvDataSources({
      currentTime: currentTime,
      envConfigEntry: mockEnvConfig
    }, function(err){
      assert.ok(!err, "Expected No Error " + err);

      sinon.assert.calledOnce(dsListForUpdate);
      sinon.assert.calledOnce(updateSingleDataSourceStub);

      sinon.assert.calledOnce(listDeployedServices);

      done();
    });
  },
  "It Should Process Update The Data Source With An Error If There Is No Deployed Service": function(done){
    var mockEnvConfig = fixtures.envConfig();
    var currentTime = new Date();

    var dsListStub = stubs.services.appForms.dataSources.listForUpdate();

    //No Deployed Services
    var listDeployedServices = sinon.stub().callsArgWith(1, undefined, []);

    var updateSingleDataSourceStub = stubs.dataSourceUpdater.handlers.updateSingleDataSource(true);

    var mocks = {
      '../../../services/appForms/dataSources': {
        listForUpdate: dsListStub
      },
      './updateSingleDataSource': updateSingleDataSourceStub,
      '../../../services/appmbaas/listDeployedServices': listDeployedServices,
      '../logger': mockLogger
    };

    var processEnvDataSources = proxyquire('../../../../lib/dataSourceUpdater/lib/handlers/processEnvDataSources', mocks);

    processEnvDataSources({
      currentTime: currentTime,
      envConfigEntry: mockEnvConfig
    }, function(err){
      assert.ok(!err, "Expected No Error");

      sinon.assert.calledOnce(dsListStub);

      //The Update Data Source Function Should Have Been Called With An Error
      sinon.assert.calledOnce(updateSingleDataSourceStub);

      sinon.assert.calledOnce(listDeployedServices);

      done();
    });
  }
};