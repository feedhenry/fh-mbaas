var proxyquire = require('proxyquire');
var assert = require('assert');
var sinon = require('sinon');

var mongoConnectStub = sinon.stub();
var mockCollection = {
  findOne: sinon.stub()
};

var mockDb = {
  collection: sinon.stub(),
  addUser: sinon.stub(),
  close: sinon.stub()
};

var underTest = proxyquire('../../../lib/util/mongo', {
  mongodb: {
    MongoClient: {
      connect: mongoConnectStub
    }
  }
});

exports.testGetAdminUrl = function(done) {
  var mongourl = "mongo://test.example.com/test";
  var adminDbUrl = underTest.getAdminDbUrl(mongourl, {user: "test", pass: "test"});
  assert.equal(adminDbUrl, "mongo://test:test@test.example.com/admin");
  done();
};

exports.testCreateDbUser = function(done) {
  var targetDbUrl = "mongo://test.example.com/test";
  var user = {
    username: 'test',
    password: 'test',
    roles: ['test']
  };

  mongoConnectStub.yields(null, mockDb);
  mockDb.collection.returns(mockCollection);
  mockCollection.findOne.yields(null, null);
  mockDb.addUser.yields(null, "newUser");

  underTest.createDbUser(targetDbUrl, user, function(err, user){
    assert.ok(!err);
    assert.ok(user);
    assert.ok(mockDb.close.calledOnce);
    done();
  });
};

exports.hasUserSpaceDb = function(done) {
  process.env.MONGODB_USERDB_NAMESPACE = 'henry.3-node-mbaas';
  assert.ok(underTest.hasUserSpaceDb());

  process.env.MONGODB_USERDB_NAMESPACE = '';
  assert.ok(!underTest.hasUserSpaceDb());

  delete process.env.MONGODB_USERDB_NAMESPACE;
  assert.ok(!underTest.hasUserSpaceDb());
  
  done();
};
