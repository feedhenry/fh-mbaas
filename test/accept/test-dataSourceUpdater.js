var sinon = require('sinon');
var assert = require('assert');
var fixtures = require('../fixtures');
var proxyquire = require('proxyquire');
var stubs = require('../stubs');
var fhConfig = require('fh-config');
fhConfig.setRawConfig(fixtures.config);



module.exports = {
  "It Should Update A Single Data Source": function(done){
    var mockConfig = fixtures.envConfig();

    var mockDS = fixtures.forms.dataSources.withData();
    var mockDeployedService = fixtures.services.deployedService();

    var dsListStub = stubs.forms.core.dataSources.list();
    var dsUpdateCacheStub = stubs.forms.core.dataSources.updateCache();

    //Mock Mbaas
    var mbaasFindStub = sinon.stub();
    mbaasFindStub.withArgs(sinon.match.object, sinon.match.func).callsArgWith(1, undefined, [mockConfig]);

    mbaasFindStub.throws("Invalid Arguments");

    //Mock App Mbaas
    var appMbaasFindStub = sinon.stub();
    appMbaasFindStub.withArgs(sinon.match({
      domain: fixtures.mockDomain,
      environment: fixtures.mockEnv,
      isServiceApp: true
    }), sinon.match.func).callsArgWith(1, undefined, [mockDeployedService]);

    appMbaasFindStub.throws("Invalid Arguments");


    var getServData = sinon.stub();
    getServData.withArgs(sinon.match({
        url: mockDeployedService.url + mockDS.endpoint,
        headers: sinon.match({
          'X-FH-SERVICE-ACCESS-KEY': mockDeployedService.serviceAccessKey
        }),
        json: true
      }), sinon.match.func)
      .callsArgWith(1, undefined, {
        statusCode: 200
      }, mockDS.data);

    getServData.throws("Invalid Arguments");

    var mocks = {
      'fh-mbaas-middleware': {
        '@global': true,
        mbaas: function(){
          return {
            find: mbaasFindStub
          }
        },
        appmbaas: function(){
          return {
            find: appMbaasFindStub
          }
        }
      },
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            list: dsListStub,
            updateCache: dsUpdateCacheStub
          }
        }
      },
      'request': {
        '@global': true,
        get: getServData
      },
      'fh-config': {
        '@global': true,
        getLogger: fhConfig.getLogger
      }
    };

    var dataSourceUpdater = proxyquire('../../lib/dataSourceUpdater', mocks);

    dataSourceUpdater(fhConfig.getLogger()).handlers.updateAllEnvDataSourceCache({}, function(err){
      assert.ok(!err, "Expected No Error");

      done();
    });

  }
};