var _ = require('underscore');


var mongoMock = {
  createMockedDbConnection: function(uri) {

    // Mocked DB Object
    return {
      mockedDb: require('../../fixtures/appdata/export/app1db.json'),
      collection: function(name) {
        return {
          mockedCollection: this.mockedDb.collections[name],
          stats: function(cb) {
            cb(null, {
              size: this.mockedCollection.size
            });
          }
        }
      },
      collectionNames: function(cb) {
        cb(null, Object.keys(this.mockedDb.collections));
      },
      close: function(cb) {
        cb();
      }
    };
  },
  connect: function(uri, cb) {
    cb(null, this.createMockedDbConnection(uri));
  }
}

module.exports.MongoClient=mongoMock;