var sinon = require('sinon');
var proxyquire = require('proxyquire');
var assert = require('assert');
var _ = require('underscore');

var mockAppMbaasModel = {
  appname: "somedomain-someappguid-someenv",
  guid: "someappguid",
  coreHost: "somecorehost.com",
  domain: "somedomain",
  environment: "someenvironment",
  apiKey: "appapikey1234",
  accessKey: "someenvacesskey",
  type: "feedhenry"
};

module.exports = {
  test_get_project_forms: function (finish) {
    var formsResponse = ["formid1234"];
    var getParam = sinon.stub().withArgs('x-fh-auth-app').returns('appapikey1234');
    var request = sinon.stub().withArgs(sinon.match({url: "https://somecorehost.com/api/v2/appforms/apps/domain/somedomain/projects/someprojectid/apps/someappguid/forms",
      headers: sinon.match({
        'x-fh-auth-app': "appapikey1234"
      })
    })).callsArgWith(1, undefined, {statusCode: 200}, formsResponse);

    var next = sinon.spy();

    var mocks = {
      'request': request
    };

    var listProjectForms = proxyquire('../../../lib/middleware/forms.js', mocks).listProjectForms;

    var req = {
      params: {
        projectid: "someprojectid",
        appid: "someappguid",
        domain: "somedomain",
        environment: "someenvironment",
        id: "somethemeid"
      },
      appMbaasModel: _.clone(mockAppMbaasModel),
      get: getParam
    };

    listProjectForms(req, {}, next);

    assert.ok(next.calledOnce, "Expected Next To Be Called Once");

    assert.equal(req.appformsResultPayload.data, formsResponse);
    finish();
  },
  test_get_project_theme: function (finish) {
    var themesResponse = {
      _id: "somethemeid",
      css: "somecssfortheme"
    };
    var getParam = sinon.stub().withArgs('x-fh-auth-app').returns('appapikey1234');
    var request = sinon.stub().withArgs(sinon.match({url: "https://somecorehost.com/api/v2/appforms/apps/domain/somedomain/projects/someprojectid/apps/someappguid/themes/somethemeid",
      headers: sinon.match({
        'x-fh-auth-app': "appapikey1234"
      })
    })).callsArgWith(1, undefined, {statusCode: 200}, themesResponse);

    var next = sinon.spy();

    var mocks = {
      'request': request
    };

    var getProjectTheme = proxyquire('../../../lib/middleware/forms.js', mocks).getProjectTheme;

    var req = {
      params: {
        projectid: "someprojectid",
        appid: "someappguid",
        domain: "somedomain",
        environment: "someenvironment"
      },
      appMbaasModel: _.clone(mockAppMbaasModel),
      get: getParam
    };

    getProjectTheme(req, {}, next);

    assert.ok(next.calledOnce, "Expected Next To Be Called Once");

    assert.equal(req.appformsResultPayload.data, themesResponse);
    finish();
  },
  test_get_project_form_config: function (finish) {
    var formsConfigResponse = {
      client: {
        photoHeight: 1234
      }
    };
    var getParam = sinon.stub().withArgs('x-fh-auth-app').returns('appapikey1234');
    var request = sinon.stub().withArgs(sinon.match({url: "https://somecorehost.com/api/v2/appforms/apps/domain/somedomain/projects/someprojectid/apps/someappguid/config",
      headers: sinon.match({
        'x-fh-auth-app': "appapikey1234"
      })
    })).callsArgWith(1, undefined, {statusCode: 200}, formsConfigResponse);

    var next = sinon.spy();

    var mocks = {
      'request': request
    };

    var getProjectTheme = proxyquire('../../../lib/middleware/forms.js', mocks).getProjectTheme;

    var req = {
      params: {
        projectid: "someprojectid",
        appid: "someappguid",
        domain: "somedomain",
        environment: "someenvironment"
      },
      appMbaasModel: _.clone(mockAppMbaasModel),
      get: getParam
    };

    getProjectTheme(req, {}, next);

    assert.ok(next.calledOnce, "Expected Next To Be Called Once");

    assert.equal(req.appformsResultPayload.data, formsConfigResponse);
    finish();
  }
};
