var sinon = require('sinon');
var fixtures = require('../../fixtures');
var _ = require('underscore');

var mockMongoUrl = fixtures.mockMongoUrl;

module.exports = {
  core: {
    getSubmissions: function(params){
      params = params || {};
      var stub = sinon.stub();

      var expectedPaginationParams = {
        page: params.expectedPage ? params.expectedPage : sinon.match.number,
        limit: params.expectedLimit ? params.expectedLimit : sinon.match.number
      };

      //Checking for a filter param if required.
      if(params.expectedFilter){
        expectedPaginationParams.filter = sinon.match(params.expectedFilter);
      }

      var expectedParams = {
        paginate: sinon.match(expectedPaginationParams)
      };

      if(params.expectedFormId){
        expectedParams.formId = sinon.match(params.expectedFormId);
      }

      if(params.expectedProjectId){
        expectedParams.appId = sinon.match(params.expectedProjectId);
      }

      stub.withArgs(sinon.match({
        uri: sinon.match.string
      }), sinon.match(expectedParams), sinon.match.func).callsArgWith(2, undefined, {
        submissions: [fixtures.forms.submissions.get(), fixtures.forms.submissions.get()],
        total: 2,
        pages: 1
      });

      stub.throws("Invalid Arguments");

      return stub;
    },
    submissionSearch: function(params){
      params = params || {};
      var stub = sinon.stub();

      stub.withArgs(sinon.match({
        uri: sinon.match.string
      }), sinon.match({
        clauseOperator: sinon.match.string,
        queryFields: sinon.match.object,
        paginate: sinon.match({
          page: params.expectedPage ? params.expectedPage : sinon.match.number,
          limit: params.expectedLimit ? params.expectedLimit : sinon.match.number
        })
      }), sinon.match.func).callsArgWith(2, undefined, {
        submissions: [fixtures.forms.submissions.get(), fixtures.forms.submissions.get()],
        total: 2,
        pages: 1
      });

      stub.throws("Invalid Arguments");

      return stub;
    },
    dataSources: {
      get: function () {
        var mockDataSource = fixtures.forms.dataSources.withData();
        var mockDataSourceWithAuditLogs = fixtures.forms.dataSources.withAuditLogs();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', mockMongoUrl), sinon.match({
          _id: mockDataSource._id,
          includeAuditLog: sinon.match.falsy
        }), sinon.match.func).callsArgWith(2, undefined, mockDataSource);

        //Looking for audit logs
        stub.withArgs(sinon.match({
          uri: mockMongoUrl
        }), sinon.match({
          _id: mockDataSource._id,
          includeAuditLog: true
        }), sinon.match.func).callsArgWith(2, undefined, mockDataSourceWithAuditLogs);

        stub.throws("Invalid Arguments");

        return stub;
      },
      getAuditLogEntry: function(){
        var mockAuditLog = fixtures.forms.dataSources.auditLog();

        var stub = sinon.stub();

        stub.withArgs(sinon.match({
          uri: mockMongoUrl
        }), sinon.match({
          _id: mockAuditLog._id
        }), sinon.match.func).callsArgWith(2, undefined, mockAuditLog);

        stub.throws("Invalid Arguments");

        return stub;
      },
      list: function () {

        var mockDataSource = fixtures.forms.dataSources.get();
        var stub = sinon.stub();

        stub.withArgs(sinon.match.has('uri', sinon.match(function (val) {
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
      validate: function () {
        var validateDataSourceStub = sinon.stub();

        var dsWithData = fixtures.forms.dataSources.withData();

        validateDataSourceStub.withArgs(
          sinon.match(
            {
              uri: fixtures.envConfig().dbConf.expectedMongoUrl
            }
          ),  sinon.match({
            _id: dsWithData._id,
            data: sinon.match.array
          }),
          sinon.match.func
          )
          .callsArgWith(2, undefined, _.extend(dsWithData, {
            validationResult: {
              valid: true,
              message: "Data Is Valid"
            }
          }));

        validateDataSourceStub.throws("Invalid Arguments");

        return validateDataSourceStub;
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
