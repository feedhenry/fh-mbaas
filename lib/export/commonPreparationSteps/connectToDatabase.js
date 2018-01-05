'use strict';

const MongoClient = require('mongodb').MongoClient;


//[db-inspect]
/**
 * Connects to the database.
 *
 * @param context an object containing the details of the collections to be exported:
 *   - mongoUri : the URI to be used to connect to the mongo db
 *   - collections : the name of the collections.
 *   - exportJob : a database object to be used to persist export info
 *   INPUT: context  {exportJob:exportJob, uri: mongoUri, collections: collections}
 *   OUTPUT:  err, context {exportJob: exportJob, uri: mongoUri, collections: collections, db: mongoDbConnection }
 * @param cb the callback.
 */
function connectToDb(context, cb) {
  const logger = context.logger;
  logger.info('Connecting to app database', {uri: context.uri});
  MongoClient.connect(context.uri, function(err, db) {
    context.db = db;
    cb(err, context);
  });
}

module.exports = connectToDb;
