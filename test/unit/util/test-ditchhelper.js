var proxyquire = require('proxyquire');
var assert = require('assert');
var sinon = require('sinon');
var request = require('request');
var fhconfig = require('fh-config');


var DOMAIN = 'test';
var ENVIRONMENT = 'test';
var APPNAME = 'testappname';

exports.it_should_call_fh_ditch = function(finish){
  var mock = sinon.mock(request);
  var post = mock.expects('post');
  var ditchhelper = proxyquire('../../../lib/util/ditchhelper', {request: mock});

  var cb1 = sinon.spy();
  var cb2 = sinon.spy();

  post.callsArg(1);
  ditchhelper.doMigrate(DOMAIN, ENVIRONMENT, APPNAME, 'testcachekey', 'testappguid', cb1);
  post.once();
  post.calledWith({url: 'http://localhost:9999/sys/admin/migratedb', json:{
    cacheKey: 'testcachekey',
    domain: DOMAIN,
    env: ENVIRONMENT,
    appName: APPNAME,
    appGuid: 'testappguid'
  }}, cb1);
  post.verify();
  assert.ok(cb1.calledOnce);

  post.reset();

  post.callsArg(1);
  ditchhelper.migrateComplete(DOMAIN, ENVIRONMENT, APPNAME, 'testcachekey', 'testappguid', cb2);
  post.once();
  post.calledWith({url: 'http://localhost:9999/sys/admin/completeMigration', json:{
    domain: DOMAIN,
    env: ENVIRONMENT,
    appName: APPNAME,
    cacheKey: 'testcachekey',
    appGuid: 'testappguid'
  }}, cb2);
  post.verify();  
  assert.ok(cb2.calledOnce);

  finish();
};

exports.it_should_check_status = function(finish){
  var mock = sinon.mock(request);
  var get = mock.expects('get');
  var ditchhelper = proxyquire('../../../lib/util/ditchhelper', {request: mock});

  var cb = sinon.spy();
  get.callsArgWith(1, null, {}, {});
  ditchhelper.checkStatus(cb);
  get.calledWith({url: 'http://localhost:9999/sys/info/status', json: true}, cb);
  get.verify();
  assert.ok(get.calledOnce);
  finish();
};

