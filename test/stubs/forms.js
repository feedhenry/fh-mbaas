var sinon = require('sinon');
var fixtures = require('../fixtures');

var mockMongoUrl = fixtures.mockMongoUrl;

module.exports = {
  core: {
    dataSources: {
      get: function(){
        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match.has("_id", mockDataSource._id), sinon.match.func).callsArgWith(2, undefined, mockDataSource);

        stub.throws("Invalid Arguments");

        return stub;
      },
      list: function(){

        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match.object, sinon.match.func).callsArgWith(2, undefined, [mockDataSource]);

        stub.throws("Invalid Arguments");

        return stub;
      },
      deploy: function(){

        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match.has("_id", mockDataSource._id).and(sinon.match.has("name", mockDataSource.name)), sinon.match.func).callsArgWith(2, undefined, mockDataSource);

        stub.throws("Invalid Arguments");

        return stub;
      },
      remove: function(){
        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match.has("_id", mockDataSource._id), sinon.match.func).callsArgWith(2);

        stub.throws("Invalid Arguments");

        return stub;
      }
    }
  }
};