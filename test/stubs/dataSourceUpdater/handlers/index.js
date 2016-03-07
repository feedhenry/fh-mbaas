var sinon = require('sinon');
var fixtures = require('../../../fixtures');

module.exports = {
  processEnvDataSources: function () {
    var stub = sinon.stub();
    var mockEnvConfig = fixtures.envConfig();

    stub.withArgs(
      sinon.match(
        {
          currentTime: sinon.match.date,
          envConfigEntry: mockEnvConfig
        }
      ), sinon.match.func
      )
      .callsArg(1);

    stub.throws("Invalid Arguments");

    return stub;
  },
  requestEndpointData: function () {
    var stub = sinon.stub();

    stub.withArgs(
      sinon.match(
        {
          fullUrl: sinon.match.string,
          accessKey: sinon.match.string
        }
      ), sinon.match.func
    ).callsArgWith(1, undefined, fixtures.forms.dataSources.dsDataSet());

    stub.throws("Invalid Arguments");

    return stub;
  },
  updateDataSourceCache: function () {
    var stub = sinon.stub();
    var dsWithData = fixtures.forms.dataSources.withData();
    var dsWithError = fixtures.forms.dataSources.withError();

    stub.withArgs(
      sinon.match(
        {
          mongoUrl: sinon.match.string,
          dataSourceId: dsWithData._id,
          data: sinon.match.array.and(sinon.match([sinon.match(dsWithData.data[0]), sinon.match(dsWithData[1])]))
        }
      ), sinon.match.func
    ).callsArgWith(
      1, {
        validDataSourceUpdates: [dsWithData]
      }
    );

    stub.withArgs(
      sinon.match(
        {
          mongoUrl: sinon.match.string,
          dataSourceId: dsWithData._id,
          error: sinon.match(dsWithError.currentStatus.error)
        }
      ), sinon.match.func
    ).callsArgWith(
      1, {
        validDataSourceUpdates: [dsWithError]
      }
    );

    stub.throws("Invalid Arguments");

    return stub;
  },
  updateSingleDataSource: function (expectError) {
    var stub = sinon.stub();
    var dsWithData = fixtures.forms.dataSources.withData();
    var dsWithError = fixtures.forms.dataSources.withError();
    var deployedService = fixtures.services.deployedService();

    if(!expectError){
      stub.withArgs(
        sinon.match(
          {
            accessKey: deployedService.serviceAccessKey,
            fullUrl: sinon.match.string,
            dataSourceId: dsWithData._id,
            mongoUrl: sinon.match.string
          }
        ),
        sinon.match.func
      ).callsArgWith(1, undefined);
    } else {
      stub.withArgs(
        sinon.match(
          {
            accessKey: sinon.match.falsy,
            fullUrl: sinon.match.falsy,
            dataSourceId: dsWithError._id,
            mongoUrl: sinon.match.string,
            error: sinon.match({
              code: sinon.match.string,
              userDetail: sinon.match.string,
              systemDetail: sinon.match.string
            })
          }
        ),
        sinon.match.func
      ).callsArgWith(1, undefined);
    }

    stub.throws(new Error("Invalid Arguments"));

    return stub;
  }
};