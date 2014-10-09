var MongoClient = require('mongodb').MongoClient;
var util = require('util');
var Server = require('mongodb').Server;
var logger = require('./logger.js').getLogger();
var ReplSetServers = require('mongodb').ReplSetServers;
var _ = require('underscore');

function handleError(db, err, message, cb){
  if(db){
    db.close();
  }
  logger.error(err, message);
  if(cb){
    return cb(err);
  }
}

// create a database, including user name and pwd
function createDb(adminOpts, dbUser, dbUserPass, dbName, cb) {
  logger.trace({user: dbUser, pwd: dbUserPass, name: dbName}, 'creating new datatbase');

  var serverObj = getServerObj(adminOpts.host, adminOpts.port);

  var mongoClient = new MongoClient(serverObj);
  mongoClient.open(function(err, mc) {
    if (err) return handleError(null, err, 'cannot open mongodb connection', cb);
    var db = mc.db(dbName);
    db.authenticate(adminOpts.user, adminOpts.pass, {'authSource': 'admin'}, function(err) {
      if (err) return handleError(db, err, 'can not authenticate admin user', cb);

      // add user to database
      db.addUser(dbUser, dbUserPass, function(err, user) {
        if (err) return handleError(db, err, 'can not add user', cb);
        logger.trace({user: user, database: dbName}, 'mongo added new user');
        db.close();
        return cb();
      });
    });
  });
}

//drop a database
function dropDb(adminOpts, dbUser, dbName, cb){
  logger.trace({user: dbUser, name: dbName}, 'drop database');
  var serverObj = getServerObj(adminOpts.host, adminOpts.port);

  var mongoClient = new MongoClient(serverObj);
  mongoClient.open(function(err, mc){
    if (err) return handleError(null, err, 'cannot open mongodb connection', cb);

    var adminDb = mc.admin();
    adminDb.authenticate(adminOpts.user, adminOpts.pass, {'authSource': 'admin'}, function(err){
      if (err) return handleError(adminDb, err, 'can not authenticate admin user', cb);

      adminDb.listDatabases(function(err, dbs){
        if(err) return handleError(adminDb, err, 'can not list dbs', cb);
        dbs = dbs.databases;
        var dbToDrop = _.find(dbs, function(db){
          return db.name === dbName;
        });
        if(dbToDrop){
          var db = mc.db(dbToDrop);
          db.removeUser(dbUser, function(err){
            if(err){
              logger.error(err, 'failed to remove user');
            }
            db.dropDatabase(function(err){
              adminDb.close();
              if(err) return handleError(db, err, 'failed to drop database', cb);
              db.close();
              return cb();
            });
          });
        } else {
          adminDb.close();
          logger.info({user: dbUser, name: dbName}, 'no db to drop');
          return cb();
        }
      });
    });
  });
}

function createServerObj(host, port) {
  return new Server(host, typeof port === 'string'? parseInt(port): port);
}

function createReplSetObj(numHosts, hosts, ports) {
  var servers = [];
  var i;
  for (i = 0; i < numHosts; i += 1) {
    var port = ports.length === 1 ? ports[0]: ports[i];
    servers[i] = new Server(hosts[i], typeof port === 'string'? parseInt(port) : port);
  }
  return new ReplSetServers(servers);
}

function getServerObj(host, port) {
  var hosts = host.split(',');
  var ports = [port];
  if(typeof port === 'string') {
    ports = port.split(',');
  }
  var numHosts = hosts.length;
  if(numHosts === 1) {
    return createServerObj(hosts[0], ports[0]);
  } else {
    return createReplSetObj(numHosts, hosts, ports);
  }
}

exports.createDb = createDb;
exports.dropDb = dropDb;