var MongoClient = require('mongodb').MongoClient;
var logger = require('../util/logger').getLogger();

function handleError(db, err, message, cb) {
  if (db && db.close) {
    db.close();
  }
  logger.error(err, message);
  if (cb) {
    return cb(err);
  }
}

// create a database, including user name and pwd
function createDb(config, dbUser, dbUserPass, dbName, cb) {
  logger.trace({user: dbUser, pwd: dbUserPass, name: dbName}, 'creating new datatbase');

  MongoClient.connect(config.mongoUrl, function(err, db) {
    if (err) {
      return handleError(null, err, 'cannot open mongodb connection', cb);
    }

    var targetDb = db.db(dbName);
    targetDb.authenticate(config.mongo.admin_auth.user, config.mongo.admin_auth.pass, {'authSource': 'admin'}, function(err) {
      if (err) {
        return handleError(db, err, 'can not authenticate admin user', cb);
      }

      // add user to database
      targetDb.addUser(dbUser, dbUserPass, function(err, user) {
        if (err) {
          return handleError(db, err, 'can not add user', cb);
        }
        logger.trace({user: user, database: dbName}, 'mongo added new user');

        db.close();
        return cb();
      });
    });
  });
}

//drop a database
function dropDb(config, dbUser, dbName, cb) {
  logger.trace({user: dbUser, name: dbName}, 'drop database');
  MongoClient.connect(config.mongoUrl, function(err, dbObj) {
    if (err) {
      return handleError(null, err, 'cannot open mongodb connection', cb);
    }

    var dbToDrop = dbObj.db(dbName);
    dbToDrop.authenticate(config.mongo.admin_auth.user, config.mongo.admin_auth.pass, {'authSource': 'admin'}, function(err) {
      if (err) {
        return handleError(dbObj, err, 'can not authenticate admin user', cb);
      }

      dbToDrop.removeUser(dbUser, function(err) {
        if (err) {
          logger.error(err, 'failed to remove user');
        }
        dbToDrop.dropDatabase(function(err) {
          if (err) {
            return handleError(dbObj, err, 'failed to drop database', cb);
          }
          dbObj.close();
          return cb();
        });
      });
    });
  });
}

exports.createDb = createDb;
exports.dropDb = dropDb;
