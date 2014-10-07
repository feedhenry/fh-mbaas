var MongoClient = require('mongodb').MongoClient;
var util = require('util');
var Server = require('mongodb').Server;
var logger = require('./logger.js').getLogger();
var ReplSetServers = require('mongodb').ReplSetServers;

exports.createDb = createDb;

// create the domain database, including user name and pwd
function createDb(adminOpts, domainUser, domainPassword, domainDatabase, cb) {
  logger.trace({user: domainUser, pwd: domainPassword, name: domainDatabase}, 'creating new datatbase');

  var serverObj = getServerObj(adminOpts.host, adminOpts.port);

  var mongoClient = new MongoClient(serverObj);
  mongoClient.open(function(err, mc) {
    console.log('mongodbclient connected');
    if (err) return cb(err);
    var db = mc.db(domainDatabase);
    db.authenticate(adminOpts.user, adminOpts.pass, {'authSource': 'admin'}, function(err) {
      if (err) return cb(err);

      // add user to database
      db.addUser(domainUser, domainPassword, function(err, user) {
        if (err) return cb(err);
        logger.trace({user: user, database: domainDatabase}, 'mongo added new user');
        db.close();
        return cb();
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
