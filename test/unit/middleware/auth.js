var sinon = require('sinon');
var proxyquire = require('proxyquire');
var assert = require('assert');

module.exports = {
  test_app_auth: function(finish){
    var getParam = sinon.stub().returns(null);
    getParam.withArgs('x-fh-auth-app').returns('appapikey1234');

    var requiredAppMbaasModel = {
      domain: "somedomain",
      environment: "someenv",
      projectid: "someprojectid",
      guid: "someappid",
      accessKey: "someenvaccesskey1234",
      apiKey: "appapikey1234",
      type: "feedhenry"
    };

    var getMbaasApp = sinon.stub().withArgs(sinon.match(requiredAppMbaasModel)).callsArgWith(1, undefined, requiredAppMbaasModel);

    var res = {
      status: sinon.spy(),
      end: sinon.spy()
    };
    var next = sinon.spy();

    var req = {
      params: {
        domain: "somedomain",
        environment: "someenv",
        projectid: "someprojectid",
        appid: "someappid"
      },
      get: getParam
    };

    var mocks = {
      '../middleware/app.js': {
        getMbaasApp: getMbaasApp
      }
    };

    var appAuth = proxyquire('../../../lib/middleware/auth.js', mocks).app;

    //Should Be Invalid
    appAuth(req, res, next);

    assert.ok(res.status.calledWith(401), "Expected The Response To Be 401");
    assert.ok(res.end.calledOnce, "Expected End To Be Called");
    assert.ok(next.callCount === 0, "Expected next not to be called");

    //Giving correct params
    getParam.withArgs('x-fh-env-access-key').returns('someenvaccesskey1234');

    //Should Now be Valid
    appAuth(req, res, next);

    assert.ok(res.status.calledOnce, "Expected The Response To Be Called Once");
    assert.ok(res.end.calledOnce, "Expected End To Be Called");
    assert.ok(next.calledOnce, "Expected next to be called once");

    finish();
  }
};