var sinon = require('sinon');
var proxyquire = require('proxyquire');
var assert = require('assert');
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
  "It Should Request A Data Source Data Set": function(done){
    var mockAccessKey = "serviceaccess1234";
    var mockUrl = "https://some.service.host.com/some/data/endpoint";
    var mockDSData = [{
      key: "dskey1",
      value: "Value 1",
      selected: true
    },
      {
        key: "dskey2",
        value: "Value 2",
        selected: false
      }];
    var getStub = sinon.stub();
    getStub.withArgs(sinon.match({
      url: mockUrl,
      headers: sinon.match({
        'X-FH-SERVICE-ACCESS-KEY': mockAccessKey
      }),
      json: true
    }), sinon.match.func)
      .callsArgWith(1, undefined, {
        statusCode: 200
      }, mockDSData);

    getStub.throws("Invalid Arguments");


    var mocks = {
      'request': {
        get: getStub
      },
      '../logger': mockLogger
    };

    var requestEnvDataSources = proxyquire('../../../../lib/dataSourceUpdater/lib/handlers/requestEndpointData', mocks);

    requestEnvDataSources({
      fullUrl: mockUrl,
      accessKey: mockAccessKey
    }, function(err, data){
      assert.ok(!err, "Expected No Error");

      assert.equal("dskey1", data[0].key);
      sinon.assert.calledOnce(getStub);
      done();
    });
  }
};