var MongoClient = require('mongodb').MongoClient;
var logger = require('fh-config').getLogger();

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
      if (err) return handleError(db, err, 'can not authenticate admin user', cb);

      // add user to database
      targetDb.addUser(dbUser, dbUserPass, function(err, user) {
        if (err) return handleError(db, err, 'can not add user', cb);
        logger.trace({user: user, database: dbName}, 'mongo added new user');

        db.close();
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

    var dbToDrop = dbObj.db(dbName);
    dbToDrop.authenticate(fhconfig.value('mongo.admin_auth.user'), fhconfig.value('mongo.admin_auth.pass'), {'authSource': 'admin'}, function(err){
      if(err) return handleError(dbObj, err, 'can not authenticate admin user', cb);

      dbToDrop.removeUser(dbUser, function(err){
        if(err){
          logger.error(err, 'failed to remove user');
        }
        dbToDrop.dropDatabase(function(err){
          if(err) return handleError(dbObj, err, 'failed to drop database', cb);
          dbObj.close();
          return cb();
        });
      });
    });
  });
}

exports.createDb = createDb;
exports.dropDb = dropDb;