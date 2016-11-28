var MongoWrapper = require('../shared/mongowrapper/mongowrapper').MongoWrapper;

/**
 * Runs the import for the specified collection
 * @param host mongo host
 * @param port mongo port
 * @param database mongo database
 * @param filename collection bson file to be imported (full path)
 * @param cb
 */
function mongoImport(host, port, database, filename, cb) {
  var mongoWrapper = new MongoWrapper();

  mongoWrapper.restore()
    .withDatabase(database)
    .withPath(filename)
    .withHost(host)
    .withPort(port)
    .withDetectMaster()
    .run(function(err, process) {
      if (err) {
        return cb(err);
      }
      process.on('close', function(code) {
        if (code === 0) {
          return cb();
        }
        return cb(new Error('Error executing import. Return code : ' + code));
      })
        .on('error', function(err) {
          return cb(new Error(err));
        });

    });
}

module.exports.mongoImport = mongoImport;
