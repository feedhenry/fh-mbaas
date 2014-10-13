var assert = require('assert');
var util = require('util');
var express = require('express');
var app = express();
var cors = require('cors');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var ditchServer;
var ditchPort = 19001;
var dynofarmServer;
var dynofarmPort = 19002;

// enable mongo
var fhconfig = require('fh-config');
fhconfig.setRawConfig({
  fhmbaas:{
    key:'testkey'
  },
  mongo:{
    enabled: true,
    host: 'localhost',
    port: 27017,
    name: 'test-fhmbaas-accept',
    auth: {
      enabled: false
    },
    admin_auth: {
      user: 'admin',
      pass: 'admin'
    }
  },
  fhditch:{
    host:'localhost',
    port:ditchPort,
    protocol:'http'
  },
  fhdfc:{
    "dynofarm":'http://localhost:' + dynofarmPort,
    "username":"fh",
    "_password": "fh",
    "loglevel": "warn"
  }
});

var auth = require('../../lib/middleware/auth');
var dfutils = require('../../lib/util/dfutils');
var models = require('../../lib/models')();

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use('/api', auth(fhconfig));

var server;

var deleteAmdinUser = false;
var new_db_prefix = "fhmbaas-accept-test";



function setupDitchServer(cb){
  var ditchApp = express();
  ditchApp.use(bodyParser.json());
  ditchApp.use('*', function(req, res){
    return res.json({});
  });
  ditchServer = ditchApp.listen(ditchPort, function(){
    console.log('Ditch server is running on port ' + ditchPort);
    cb();
  });
}

function setupDynofarm(cb){
  var dynoApp = express();
  dynoApp.use(bodyParser.json());
  dynoApp.use('*', function(req, res){
    console.log('[dynofarm] got request, url = ' + req.url);
    return res.json([]);
  });
  dynofarmServer = dynoApp.listen(dynofarmPort, function(){
    console.log('Dynofarm server is running on port ' + dynofarmPort);
    cb();
  });
}

function connectDb(cb){
  var dburl = fhconfig.mongoConnectionString();
  MongoClient.connect(dburl, function(err, db){
    assert.ok(!err, 'Can not connect to mongodb : ' + util.inspect(err));
    return cb(err, db);
  });
}

function createDBAdminUser(db, user, pass, cb){
  var adminDb = db.admin();
  adminDb.authenticate(user, pass, function(err, result){
    if(err){
      //create admin user, and mark for removal when test finishes
      adminDb.addUser(user, pass, function(err, result){
        console.log('Creating admin db user');
        assert.ok(!err, 'can not create admin user : ' + util.inspect(err));
        deleteAmdinUser = true;
        cb();
      });
    } else {
      //admin user already exists, continue
      cb();
    }
  });
}

function dropDBAdminUser(db, user, cb){
  if(deleteAmdinUser){
    var adminDb = db.admin();
    console.log('Remove admin db user');
    adminDb.removeUser(user, function(err){
      cb();
    });
  } else {
    cb();
  }
}


function dropCollections(db, collections, cb) {
  async.each(collections, function(collection, cb){
    console.log('Drop db collection ' + collection);
    db.dropCollection(collection, function(err, results){
      cb();
    });
  }, cb);
}

function dropDbForDomain(db, cb){
  var adminDb = db.admin();
  adminDb.listDatabases(function(err, dbs){
    assert.ok(!err, 'Failed to list databases: '+ util.inspect(err));
    var doDbRemove = null;
    dbs = dbs.databases;
    for(var i=0;i<dbs.length;i++){
      if(dbs[i].name.indexOf(new_db_prefix) >= 0){
        doDbRemove = dbs[i].name;
        break;
      }
    }
    if(doDbRemove){
      console.log('Remove test db and its user : ' + doDbRemove);
      var dbToRemove = db.db(doDbRemove);
      dbToRemove.removeUser(doDbRemove, function(err){
        if(err){
          console.error('Failed to remove user :' + doDbRemove);
        }
        dbToRemove.dropDatabase(function(err){
          assert.ok(!err, 'Failed to drop db : ' + util.inspect(err));
          cb();
        });
      });
    } else {
      cb();
    }
  });
}

exports.setUp = function(finish){
  console.log('Running setUp for acceptance tests...');
  connectDb(function(err, db){
    createDBAdminUser(db, fhconfig.value('mongo.admin_auth.user'), fhconfig.value('mongo.admin_auth.pass'), function(err){
      dropCollections(db, ['mbaas', 'appmbaas'], function(err, result){
        dropDbForDomain(db, function(err){
          db.close(true, function(){
            models.init(function(err){
              assert.ok(!err, 'Failed to init models : ' + util.inspect(err));

              app.use('/sys', require('../../lib/sys.js')());
              app.use('/api/mbaas', require('../../lib/routes/db')(models));

              var port = 8819;
              server = app.listen(port, function(){
                console.log("Test App started at: " + new Date() + " on port: " + port);
                setupDitchServer(function(){
                  setupDynofarm(function(){
                    finish();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

function removeAll(finish){
  connectDb(function(err, db){
    dropDBAdminUser(db, fhconfig.value('mongo.admin_auth.user'), function(){
      dropCollections(db, ['mbaas', 'appmbaas'], function(){
        dropDbForDomain(db, function(){
          db.close(true, function(){
            models.disconnect(function(err){
              finish();
            });
          });
        });
      });
    });
  });
}

function closeTestServer(cb){
  console.log('close test server');
  if(server){
    server.close(cb);
  } else {
    cb();
  }
}

function closeDitchServer(cb){
  console.log('close ditch server');
  if(ditchServer){
    ditchServer.close(cb);
  } else {
    cb();
  }
}

function closeDynoServer(cb){
  console.log('close dynofarm server');
  if(dynofarmServer){
    dynofarmServer.close(cb);
  } else {
    cb();
  }
}

exports.tearDown = function(finish) {
  console.log('Running tearDown for acceptance tests...');
  dfutils.clearInterval();
  closeDitchServer(function(){
    closeDynoServer(function(){
      closeTestServer(function(){
        removeAll(finish);
      });
    });
  });
};