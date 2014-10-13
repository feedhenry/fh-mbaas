var MongoClient = require('mongodb').MongoClient;
var logger = require('fh-config').getLogger();
var _ = require('underscore');

function handleError(db, err, message, cb){
  if(db && db.close){
    db.close();
  }
  logger.error(err, message);
  if(cb){
    return cb(err);
  }
}

// create a database, including user name and pwd
function createDb(fhconfig, dbUser, dbUserPass, dbName, cb) {
  logger.trace({user: dbUser, pwd: dbUserPass, name: dbName}, 'creating new datatbase');

  MongoClient.connect(fhconfig.mongoConnectionString(), function(err, db){
    if (err) return handleError(null, err, 'cannot open mongodb connection', cb);

    var targetDb = db.db(dbName);
    targetDb.authenticate(fhconfig.value('mongo.admin_auth.user'), fhconfig.value('mongo.admin_auth.pass'), {'authSource': 'admin'}, function(err) {
      if (err) return handleError(targetDb, err, 'can not authenticate admin user', cb);

      // add user to database
      targetDb.addUser(dbUser, dbUserPass, function(err, user) {
        if (err) return handleError(targetDb, err, 'can not add user', cb);
        logger.trace({user: user, database: dbName}, 'mongo added new user');
        targetDb.close();
        return cb();
      });
    });
  });
}

//drop a database
function dropDb(fhconfig, dbUser, dbName, cb){
  logger.trace({user: dbUser, name: dbName}, 'drop database');
  MongoClient.connect(fhconfig.mongoConnectionString(), function(err, dbObj){
    if (err) return handleError(null, err, 'cannot open mongodb connection', cb);

    var adminDb = dbObj.admin();
    adminDb.authenticate(fhconfig.value('mongo.admin_auth.user'),fhconfig.value('mongo.admin_auth.pass'), function(err){
      if (err) return handleError(adminDb, err, 'can not authenticate admin user', cb);
      logger.trace('admin db authenticated');
      adminDb.listDatabases(function(err, dbs){
        if(err) return handleError(adminDb, err, 'can not list dbs', cb);
        dbs = dbs.databases;
        var dbToDrop = _.find(dbs, function(db){
          return db.name === dbName;
        });
        if(dbToDrop){
          var db = dbObj.db(dbToDrop);
          db.removeUser(dbUser, function(err){
            if(err){
              logger.error(err, 'failed to remove user');
            }
            db.dropDatabase(function(err){
              if(err) return handleError(dbObj, err, 'failed to drop database', cb);
              dbObj.close();
              return cb();
            });
          });
        } else {
          dbObj.close();
          logger.info({user: dbUser, name: dbName}, 'no db to drop');
          return cb();
        }
      });
    });
  });
}

exports.createDb = createDb;
exports.dropDb = dropDb;