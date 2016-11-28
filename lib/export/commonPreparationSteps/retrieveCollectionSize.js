var async = require('async');

/**
 * Computes the total size of collections (in bytes).
 *
 * @param context an object containing the details of the app to be exported:
 *   - db : connection to the app mongo database
 *   - collections : the names of the collections owned by the application.
 *   - exportJob : a database object to be used to persist export info
 *   INPUT: context  {exportJob: exportJob, db: mongoConnection, collections: appCollections}
 *   OUTPUT:  err, context {exportJob:exportJob, db: mongoConnection, collections: collections, size: totalSize }
 * @param cb the callback
 */
function retrieveCollectionsSize(context, cb) {
  // Wrap the callback so that progress is automatically sent
  cb = context.progress.wrappCallback(cb);

  var logger = context.logger;
  logger.info('Retrieving collections size');
  context.size = 0;

  async.eachLimit(context.collections, 10, function(collectionName, callback) {
    context.db.collection(collectionName).stats(function(err, st) {
      if (err) {
        logger.error('Failure getting collection size', {collectionName: collectionName, err: err});
      } else {
        context.size += st.size;
      }
      callback(err);
    });
  }, function(err) {
    logger.info('Estimated export size', {size: context.size});
    return cb(err, context);
  });
}

module.exports = retrieveCollectionsSize;
