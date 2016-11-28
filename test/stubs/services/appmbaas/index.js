var sinon = require('sinon');
var fixtures = require('../../../fixtures');

module.exports = {

  listDeployedServices: function () {
    var stub = sinon.stub();

    stub.withArgs(sinon.match({
      domain: fixtures.mockDomain,
      environment: fixtures.mockEnv
    }), sinon.match.func).callsArgWith(1, undefined, [fixtures.services.deployedService()]);

    stub.throws("Invalid Arguments");

    return stub;
  },
  getDeployedService: function (returnNothing) {
    var stub = sinon.stub();

    stub.withArgs(sinon.match({
      domain: fixtures.mockDomain,
      environment: fixtures.mockEnv,
      guid: fixtures.services.get().guid
    }), sinon.match.func).callsArgWith(1, undefined, returnNothing ? undefined : fixtures.services.deployedService());

    stub.throws("Invalid Arguments");

    return stub;
  }
};