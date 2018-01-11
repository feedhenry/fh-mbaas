var MongoClient = require('mongodb').MongoClient;
var mongoUriParser = require('mongodb-uri');
var logger = require('../util/logger').getLogger();
var common = require('../appdata/shared/common');
const CONSTANTS = require('../appdata/shared/constants');
const fhmbaasMiddleware = require('fh-mbaas-middleware');

var SYSTEM_USER_COLLECTION_NAME = "system.users";

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
        logger.info({ user: user, database: dbName }, 'mongo added new user');

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

/**
 * Create a new user in the target database with the given user info only if the user does not eixst.
 * @param {string} targetDbUrl the database url that the user should be created in
 * @param {object} userParams user info
 * @param {string} userParams.username the username
 * @param {string} userParams.password the user password
 * @param {array} userParams.roles the roles of the user. See mongodb user privilege doc: https://docs.mongodb.com/v2.4/reference/privilege-documents/
 * @param {function} cb callback function
 */
function createDbUser(targetDbUrl, userParams, cb) {
  logger.debug({"targetDbUrl": targetDbUrl, "user": userParams}, "createing new db user");
  MongoClient.connect(targetDbUrl, function(err, targetDb) {
    if (err) {
      return handleError(targetDb, err, "failed connect to mongodb", cb);
    }
    var userCollection = targetDb.collection(SYSTEM_USER_COLLECTION_NAME);
    userCollection.findOne({user: userParams.username}, function(err, foundUser) {
      if (err) {
        return handleError(targetDb, err, "failed to read user info", cb);
      }

      if (!foundUser) {
        logger.debug({user: userParams.username}, "no existing user found, creating a new one");
        targetDb.addUser(userParams.username, userParams.password, {roles: userParams.roles}, function(err, newUser) {
          if (err) {
            return handleError(targetDb, err, "failed to create user", cb);
          }
          targetDb.close();
          return cb(undefined, newUser);
        });
      } else {
        logger.debug({user: userParams.username}, "user is already created");
        targetDb.close();
        return cb(undefined, foundUser);
      }
    });
  });
}

/**
 * Get the url of the mongo admin db.
 * @param {string} mongodbUrl a mongodb url to any mongodb databases
 * @param {object} adminAuth the admin user auth info
 * @param {string} adminAuth.user the user name of the admin user
 * @param {string} adminAuth.pass the password of the admin user
 * @returns {string} the url of the mongo admin database
 */
function getAdminDbUrl(mongodbUrl, adminAuth) {
  var parsedMongoConn = mongoUriParser.parse(mongodbUrl);
  parsedMongoConn.database = "admin";
  parsedMongoConn.username = adminAuth.user;
  parsedMongoConn.password = adminAuth.pass;
  return mongoUriParser.format(parsedMongoConn);
}

/**
 * Check whether an app has a dedicated database for an environment.
 * @param {object} params.
 * @param {string} params.domain - The domain name.
 * @param {string} params.environment - The environment name.
 * @param {string} params.appname - The app id.
 */
function hasDedicatedDb(params, cb) {
  logger.trace(params, 'is dedicated database');

  MongoClient.connect(fhmbaasMiddleware.config().mongoUrl, function(err, db) {
    if (err) {
      return handleError(null, err, 'cannot open mongodb connection', cb);
    }

    db.admin().listDatabases(function(err, result) {
      if (err) {
        return handleError(db, err, 'can not authenticate admin user', cb);
      }

      const appDbName = params.domain + '-' + params.appname + '-' + params.environment;
      const hasDedicatedDb = result.databases.some(db => db.name === appDbName);
      db.close();
      cb(null, {value: hasDedicatedDb});
    });
  });
}

function getPrimary(params, cb) {
  common.getMongoHost(params.host, params.port, CONSTANTS.MONGO_HOST_ROLE.MASTER, function(err, result) {
    if (err) {
      return cb(err);
    }

    return cb(null, {host: result.host, port: result.port});
  });
}

function hasUserSpaceDb() {
  if (process.env.MONGODB_USERDB_NAMESPACE) {
    return true;
  }

  return false;
}

exports.createDb = createDb;
exports.dropDb = dropDb;
exports.createDbUser = createDbUser;
exports.getAdminDbUrl = getAdminDbUrl;
exports.hasDedicatedDb = hasDedicatedDb;
exports.getPrimary = getPrimary;
exports.hasUserSpaceDb = hasUserSpaceDb;
