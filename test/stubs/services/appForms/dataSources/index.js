var sinon = require('sinon');
var fixtures = require('../../../../fixtures');

module.exports = {
  listForUpdate: function () {
    var stub = sinon.stub();

    stub.withArgs(
      sinon.match(
        {
          mongoUrl: fixtures.envConfig().dbConf.expectedMongoUrl,
          currentTime: sinon.match.date
        }
      ), sinon.match.func
      )
      .callsArgWith(1, undefined, [fixtures.forms.dataSources.get()]);

    stub.throws("Invalid Arguments");

    return stub;
  }
};