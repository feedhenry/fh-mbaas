var sinon = require('sinon');
var passThrough = sinon.stub().yields();

module.exports = {
  'envMongoDb': {
    'getEnvironmentDatabase': passThrough
  },
  'auth': {
    'app': passThrough
  }
};
