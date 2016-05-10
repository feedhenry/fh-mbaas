var _ = require('underscore');

function createMongoMocks(collectionObjects) {

  var collections = {};

  // Creating collections
  _.each(collectionObjects, function(collectionObject, index, context) {
      collections[collectionObject.name] = {
        stats: function(cb) {
          return cb(null, {
            size: collectionObject.size
          });
        }
      };
  });

  var mongoClientMock = {
    dbMock: {
      mockedCollections: collections,
      collection: function(name) {
        return this.mockedCollections[name];
      },
      collectionNames: function(cb) {
        var keys = Object.keys(this.mockedCollections);
        cb(null, keys);
      },
      close: function(cb) {
        cb();
      }
    },
    connect: function(mongoUrl, cb) {
      cb(null, this.dbMock);
    }
  };

  var mongoMock = {
    MongoClient: mongoClientMock
  };

  return mongoMock;
}

module.exports=createMongoMocks;