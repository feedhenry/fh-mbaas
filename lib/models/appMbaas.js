var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var timestamps = require('mongoose-timestamp');
var logger = require('fh-config').getLogger();
var common = require('../util/common');
var mongo = require('../util/mongo');
var dfutils = require('../util/dfutils');
var ditchhelper = require('../util/ditchhelper');

/**
 * A model that is used to save MBaas related information for an app.
 * @type {Schema}
 */

var AppMbaasSchema = new Schema({
  'name': {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  'domain': {
    type: String,
    required: true
  },
  'environment': {
    type: String,
    required: true
  },
  'dbConf': {
    type: Schema.Types.Mixed
  },
  'migrated': {
    type:Boolean,
    'default': false
  }
}, {collection: 'appmbaas'});

function getAppDbConf(appName, fhconfig){
  var db_name = appName;
  var user = common.randomUser();
  var pass = common.randomPassword();
  var db = {
    host: fhconfig.value('mongo.host'),
    port: fhconfig.value('mongo.port'),
    name: db_name,
    user: user,
    pass: pass
  };
  return db;
}

AppMbaasSchema.statics.createModel = function(appName, domain, env, fhconfig, cb){
  logger.info({app: appName}, 'try to create AppMbaas instance');
  var appDbConf = getAppDbConf(appName, fhconfig);
  this.create({
    name: appName,
    domain: domain,
    environment: env,
    dbConf: appDbConf
  }, function(err, created){
    if(err) return cb(err);
    logger.trace({domain: domain, env:env}, 'app db instance created');
    return cb(null, created);
  });
};

AppMbaasSchema.methods.createDb = function(fhconfig, cb){
  var appName = this.name;
  var db = this.dbConf;
  logger.info({app: appName, db: db}, 'try to create database for app');
  try{
    common.checkDbConf(db);
  }catch(e){
    logger.info({db:db}, 'db validation failed');
    return cb(e);
  }

  mongo.createDb(fhconfig, db.user, db.pass, db.name, function(err){
    if(err){
      logger.error(err, 'Failed to create db : %s', db.name);
      return cb(err);
    } else {
      logger.info(db, 'Database created');
      return cb(null, db);
    }
  });
};

AppMbaasSchema.methods.removeDb = function(fhconfig, cb){
  var appName = this.name;
  logger.info({app: appName}, 'remove db for app');
  mongo.dropDb(fhconfig, this.dbConf.user, this.dbConf.name, function(err){
    if(err) return cb(err);
    logger.trace({app:appName}, 'app db is dropped');
    return cb();
  });
};

AppMbaasSchema.methods.stopApp = function(cb){
  var appName = this.name;
  logger.info({app: appName}, 'Stop app');
  dfutils.stopApp(this.domain, this.environment, appName, function(err){
    if(err) return cb(err);
    logger.info({app: appName}, 'App stopped');
    return cb();
  });
};

AppMbaasSchema.methods.migrateDb = function(cacheKey, appGuid, cb){
  var appName = this.name;
  var self = this;
  logger.info({app: appName}, 'Migrate App db');
  ditchhelper.doMigrate(self.domain, self.environment, appName, cacheKey, appGuid, cb);
};

AppMbaasSchema.methods.completeMigrate = function(cacheKey, appGuid, cb){
  var appName = this.name;
  var self = this;
  this.migrated = true;
  logger.info({app:appName}, 'Complete app db migration');
  this.save(function(err){
    if(err) return cb(err);
    ditchhelper.migrateComplete(self.domain, self.environment, appName, cacheKey, appGuid, function(){
      //don't care about errors
      cb();
    });
  });
};

AppMbaasSchema.plugin(timestamps, {
  createdAt: 'created',
  modifiedAt: 'modified'
});

module.exports = AppMbaasSchema;