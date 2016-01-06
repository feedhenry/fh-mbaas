var sinon = require('sinon');
var fixtures = require('../../fixtures');
var _ = require('underscore');

function updateDataSources() {
  var stub = sinon.stub();
  var mockDs = fixtures.forms.dataSources.get();
  var mockService = fixtures.services.get();

  var addDsMatcher = sinon.match({
    domain: fixtures.mockDomain,
    guid: fixtures.services.get().guid,
    dataSourceIds: sinon.match.array,
    addDataSource: true
  });

  stub.withArgs(addDsMatcher).callsArgWith(1, undefined, _.extend(mockService, {dataSources: [mockDs._id]}));

  stub.throws("Invalid Arguments");

  return stub;
}

function removeDataSource() {
  var stub = sinon.stub();
  var mockService = fixtures.services.get();

  var removeDsMatcher = sinon.match({
    domain: fixtures.mockDomain,
    guid: fixtures.services.get().guid,
    dataSourceIds: sinon.match.array
  });

  stub.withArgs(removeDsMatcher).callsArgWith(1, undefined, _.extend(mockService, {dataSources: []}));

  stub.throws("Invalid Arguments");

  return stub;
}

function get(modelStubs) {
  var stub = sinon.stub();

  stub.withArgs(sinon.match(fixtures.mockMongoUrl)).returns(modelStubs);

  stub.throws("Invalid Arguments");

  return stub;
}

function findOneOrCreate(stubs) {
  stubs = stubs || {};
  var mockService = fixtures.services.get();
  var mockDs = fixtures.forms.dataSources.get();
  var stub = sinon.stub();

  var queryMatcher = sinon.match({
    domain: fixtures.mockDomain,
    guid: mockService.guid
  });

  var serviceMatcher = sinon.match({
    guid: mockService.guid,
    dataSources: [mockDs._id]
  });

  stub.withArgs(sinon.match(queryMatcher), sinon.match(serviceMatcher), sinon.match.func).callsArgWith(2, undefined, _.extend(mockService, {dataSources: [mockDs._id]}, stubs));

  stub.throws("Invalid Arguments");

  return stub;
}

function findOne(stubs) {
  stubs = stubs || {};
  var mockService = fixtures.services.deployedService();
  var mockDs = fixtures.forms.dataSources.get();
  var stub = sinon.stub();

  var queryMatcher = sinon.match({
    domain: fixtures.mockDomain,
    guid: mockService.guid
  });

  stub.withArgs(sinon.match(queryMatcher), sinon.match.func).callsArgWith(1, undefined, _.extend(mockService, {dataSources: [mockDs._id]}, stubs));

  stub.withArgs(sinon.match(queryMatcher), sinon.match.has("lean"), sinon.match.func).callsArgWith(2, undefined, _.extend(mockService, {dataSources: [mockDs._id]}));

  stub.throws("Invalid Arguments");

  return stub;
}

function find(){
  var mockService = fixtures.services.get();
  var mockDs = fixtures.forms.dataSources.get();
  var stub = sinon.stub();

  var queryMatcher = sinon.match({
    domain: fixtures.mockDomain
  });

  stub.withArgs(sinon.match(queryMatcher), sinon.match.func).callsArgWith(1, undefined, [_.extend(mockService, {dataSources: [mockDs._id]})]);

  stub.throws("Invalid Arguments");

  return stub;
}

function remove() {
  var stub = sinon.stub();

  stub.withArgs(sinon.match.func).callsArg(0);

  stub.throws("Invalid Arguments");

  return stub;
}

function save() {
  var mockService = fixtures.services.get();
  var mockDs = fixtures.forms.dataSources.get();
  var stub = sinon.stub();

  stub.withArgs(sinon.match.func).callsArgWith(0, undefined, _.extend(mockService, {dataSources: [mockDs._id]}));

  stub.throws("Invalid Arguments");

  return stub;
}

module.exports = {
  model: {
    get: get,
    findOneOrCreate: findOneOrCreate,
    findOne: findOne,
    updateDataSources: updateDataSources,
    removeDataSource: removeDataSource,
    remove: remove,
    find: find,
    save: save
  }
};