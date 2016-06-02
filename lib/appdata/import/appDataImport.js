var MongoWrapper = require('../shared/mongowrapper/mongowrapper').MongoWrapper;

/**
 * Runs the import for the specified collection
 * @param host mongo host
 * @param port mongo port
 * @param database mongo database
 * @param collection mongo collection name
 * @param filename collection bson file to be imported (full path)
 * @param cb
 */
function mongoImport(host, port, database, collection, filename, cb) {
  var mongoWrapper = new MongoWrapper(host, port);

  mongoWrapper.restore()
    .withDatabase(database)
    .withCollection(collection)
    .withPath(filename)
    .run()
    .on('close', function(code) {
      if (code === 0) {
        return cb();
      }
      return cb(new Error('Error executing import. Return code : ' + code));
    })
    .on('error', function(err) {
      return cb(new Error(err));
    });
}

module.exports.mongoImport = mongoImport;
