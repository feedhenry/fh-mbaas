var proxyquire = require('proxyquire');
var assert = require('assert');
var fhconfig = require('fh-config');
var sinon = require('sinon');

var mbaas={};
mbaas.guid="";
mbaas.domain="";
mbaas.environment="";
mbaas.coreHost="";

var prefix = "deployTest";

var middlewareMocks = {
  models: {
    getModels: function(){
      return {
        AppMbaas: {
          findOne: function(args, cb){
            cb(null,mbaas);
          }
        }
      };
    }
  }
};

var amqpStub = {
  getExchangePrefix: function(){
    return prefix;
  }
};

var supercoreApiClientMock = {};
var amqMock = sinon.mock();
var deployStatusHandler = proxyquire('../../../lib/messageHandlers/deployStatusHandler', {
  "../util/supercoreApiClient": supercoreApiClientMock,
  "fh-mbaas-middleware": middlewareMocks,
  '../util/amqp.js': amqpStub
});

exports.it_should_send_message_to_supercore = function(finish){
  var json={
    "appname": "testing-gkntbu4dnqtnl5hxzawmujmg-dev",
    "status": "finished",
    "messages": ["Deployment in progress", "Deploymentfinished"],
    "deployid": "577ab1b5a524dd2428334fc50e7a0a2e",
  };

  supercoreApiClientMock.sendMessageToSupercore = function(appMbaas, supercoreMessageType, json, callback){
    assert.ok(json);
    finish();
  };
  var conf = {fhamqp: {}};
  var connectionStub = {subscribeToTopic: sinon.stub()};
  deployStatusHandler.listenToDeployStatus(connectionStub,conf);
  deployStatusHandler.deployStatusUpdate(json);
};
