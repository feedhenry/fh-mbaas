var mockMongoUrl = "mongodb://someuser:somepassword@some.mongo.host:27017,some.mongo.host2:27017/mockdomain_mockenv?replicaSet=somereplset";

module.exports = {
  forms: require('./forms'),
  services: require('./services'),
  mockMongoUrl: mockMongoUrl,
  mockEnv: "mockenv",
  mockDomain: "mockdomain",
  config: require('./config'),
  MockReadStream: require('./mock_readStream'),
  MockWriteStream: require('./mock_writeStream'),
  appdata: require('./appdata'),
  envConfig: function(){
    return {
      domain: this.mockDomain,
      environment: this.mockEnv,
      dbConf: {
        user: "someuser",
        pass: "somepassword",
        host: "some.mongo.host,some.mongo.host2",
        replicaset_name: "somereplset",
        port: 27017,
        name: this.mockDomain + "_" + this.mockEnv,
        expectedMongoUrl: mockMongoUrl
      }
    }
  }
};
