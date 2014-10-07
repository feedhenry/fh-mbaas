var assert = require('assert');
var util = require('util');
var express = require('express');
var app = express();
var cors = require('cors');
var bodyParser = require('body-parser');
var auth = require('../../lib/middleware/auth');
var MongoClient = require('mongodb').MongoClient;

// enable mongo
var config = require('lib/util/config.js');
var cfg = config.getConfig();
cfg.fhmbaas.key = 'testkey';
cfg.fhmbaas.mongo = {
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
}
config.setConfig(cfg);

var models = require('../../lib/models')();

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use('/api', auth(cfg));

var server;

var deleteAmdinUser = false;
var new_db_prefix = "fhmbaas-accept-test";

function connectDb(cb){
  var dburl = util.format('mongodb://%s:%s/%s', cfg.fhmbaas.mongo.host, cfg.fhmbaas.mongo.port, cfg.fhmbaas.mongo.name);
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


function dropCollection(db, collection, cb) {
  console.log('Drop db collection ' + collection);
  db.dropCollection(collection, function(err, results){
    cb();
  });
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
    createDBAdminUser(db, cfg.fhmbaas.mongo.admin_auth.user, cfg.fhmbaas.mongo.admin_auth.pass, function(err){
      dropCollection(db, 'mbaas', function(err, result){
        dropDbForDomain(db, function(err){
          db.close(true, function(){
            models.init(function(err){
              assert.ok(!err, 'Failed to init models : ' + util.inspect(err));

              app.use('/sys', require('../../lib/sys.js')());
              app.use('/api/mbaas', require('../../lib/routes/db')(models));

              var port = 8819;
              server = app.listen(port, function(){
                console.log("Test App started at: " + new Date() + " on port: " + port);
                finish();
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
    dropDBAdminUser(db, cfg.fhmbaas.mongo.admin_auth.user, function(){
      dropCollection(db, 'mbaas', function(){
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

exports.tearDown = function(finish) {
  console.log('Running tearDown for acceptance tests...');
  if(server){
    server.close(function(){
      removeAll(finish);
    });
  } else {
    removeAll(finish);
  }
};
