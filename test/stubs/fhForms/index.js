var sinon = require('sinon');
var fixtures = require('../../fixtures');

var mockMongoUrl = fixtures.mockMongoUrl;

module.exports = {
  core: {
    dataSources: {
      get: function () {
        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match.has("_id", mockDataSource._id), sinon.match.func).callsArgWith(2, undefined, mockDataSource);

        stub.throws("Invalid Arguments");

        return stub;
      },
      list: function () {

        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', sinon.match(function(val){
          return val.indexOf("mongodb://") > -1;
        })), sinon.match.object, sinon.match.func).callsArgWith(2, undefined, [mockDataSource]);

        stub.throws("Invalid Arguments");

        return stub;
      },
      deploy: function () {

        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match.has("_id", mockDataSource._id).and(sinon.match.has("name", mockDataSource.name)), sinon.match.func).callsArgWith(2, undefined, mockDataSource);

        stub.throws("Invalid Arguments");

        return stub;
      },
      remove: function () {
        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match.has("_id", mockDataSource._id), sinon.match.func).callsArgWith(2);

        stub.throws("Invalid Arguments");

        return stub;
      },
      updateCache: function () {
        var updateCacheStub = sinon.stub();

        var dsWithData = fixtures.forms.dataSources.withData();

        var dsWithError = fixtures.forms.dataSources.withError();

        updateCacheStub.withArgs(
          sinon.match(
            {
              uri: fixtures.envConfig().dbConf.expectedMongoUrl
            }
          ), sinon.match(
            [sinon.match({
              _id: dsWithData._id,
              data: sinon.match.array,
              dataError: sinon.match.falsy
            })]
          ), sinon.match({
            currentTime: sinon.match.date
          }), sinon.match.func
        ).
        callsArgWith(
          3, undefined, {
            validDataSourceUpdates: [dsWithData]
          }
        );

        updateCacheStub.withArgs(
          sinon.match(
            {
              uri: fixtures.envConfig().dbConf.expectedMongoUrl
            }
          ), sinon.match(
            [sinon.match({
              _id: dsWithError._id,
              data: sinon.match.array,
              dataError: sinon.match(dsWithError.currentStatus.error)
            })]
          ), sinon.match({
            currentTime: sinon.match.date
          }), sinon.match.func
        ).
        callsArgWith(
          3, undefined, {
            validDataSourceUpdates: [dsWithError]
          }
        );


        updateCacheStub.throws("Invalid Arguments");

        return updateCacheStub;
      }
    }
  }
};