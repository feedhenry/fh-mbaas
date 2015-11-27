

module.exports = {
  forms: require('./forms'),
  services: require('./services'),
  mockMongoUrl: "mongodb://some.mongo.url/somedatabase",
  mockEnv: "mockenv",
  mockDomain: "mockdomain",
  config: require('./config'),
  envConfig: function(){
    return {
      domain: this.mockDomain,
      environment: this.mockEnv,
      dbConf: {
        user: "someuser",
        pass: "somepassword",
        host: "some.mongo.host",
        port: 27017,
        name: this.mockDomain + "_" + this.mockEnv,
        expectedMongoUrl: "mongodb://someuser:somepassword@some.mongo.host:27017/mockdomain_mockenv"
      }
    }
  }
};