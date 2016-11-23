var fixtures = require('../../fixtures');

module.exports = {
  get: function(){
    return {
      guid: "someserviceguid",
      domain: fixtures.mockDomain
    }
  },
  deployedService: function(){
    return {
      guid: "someserviceguid",
      domain: fixtures.mockDomain,
      environment: fixtures.mockEnv,
      url: "https://somedomain-someserviceguid-someenv.feedhenry.com",
      isServiceApp: true,
      accessKey: "accesskey",
      serviceAccessKey: "serviceaccesskey"
    }
  }
};