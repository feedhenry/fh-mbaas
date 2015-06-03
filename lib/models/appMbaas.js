var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var timestamps = require('mongoose-timestamp');
var logger = require('fh-config').getLogger();
var common = require('../util/common');
var mongo = require('../util/mongo');
var dfutils = require('../util/dfutils');
var ditchhelper = require('../util/ditchhelper');
var _ = require('underscore');


/**
 * A model that is used to save MBaas related information for an app.
 * @type {Schema}
 *  - name: Full App Name
 *  - guid: App Guid
 *  - domain: Domain App Is Deployed To
 *  - environment: Envrionment App Is Deployed To
 *  - dbConf: App Database Configuration
 *  - migrated: Is The App Migrated To Single Database Per App
 *  - coreHost: Hostname For The Core Platform Associated With The App
 *  - apiKey: App Api Key
 *  - accessKey: Environment/App Specific Key To Validate Apps Communicate With The Mbaas
 *  - type: Type Of Deployment (feedhenry or openshift)
 */
var AppMbaasSchema = new Schema({
  'name': {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  'guid': {
    type: String,
    required: true
  },
  'domain': {
    type: String,
    required: true
  },
  'environment': {
    type: String,
    required: true
  },
  mbaasUrl: {
    type: String,
    required: true
  },
  'dbConf': {
    type: Schema.Types.Mixed
  },
  'migrated': {
    type:Boolean,
    'default': false
  },
  'coreHost': {
    type: String,
    required: true
  },
  'apiKey': {
    type: String,
    required: true
  },
  'accessKey': {
    type: Schema.Types.ObjectId,
    required: true
  },
  'type': {
    type: String,
    required: true
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

AppMbaasSchema.statics.createModel = function(params, cb){
  logger.info(params, 'try to create AppMbaas instance');

  //Setting The Access Key For This App.
  //This only will get set once at creation time
  params.accessKey = new mongoose.Types.ObjectId();

  this.create(params, function(err, created){
    if(err) return cb(err);
    logger.trace({domain: params.domain, env: params.env}, 'app db instance created');
    return cb(null, created);
  });
};

AppMbaasSchema.methods.createDb = function(fhconfig, cb){
  var self = this;
  var appName = this.name;

  if(this.isDbMigrated()){
    return cb(new Error("Database Already Upgraded"));
  }

  if(_.has(this.dbConf, "host")){
    return cb(new Error("Database Already Created"));
  }

  //Creating A New Database Config For The App.
  var dbConfig = getAppDbConf(appName, fhconfig);
  this.dbConf = dbConfig;
  this.markModified('dbConf');
  logger.info({app: appName, db: dbConfig}, 'try to create database for app');
  try{
    common.checkDbConf(dbConfig);
  }catch(e){
    logger.info({db:dbConfig}, 'db validation failed');
    return cb(e);
  }

  mongo.createDb(fhconfig, dbConfig.user, dbConfig.pass, dbConfig.name, function(err){
    if(err){
      logger.error(err, 'Failed to create db : %s', dbConfig.name);
      return cb(err);
    } else {
      logger.info(dbConfig, 'Database created');

      //Saving The Updated Db Conf
      self.save(function(err){
        return cb(err, dbConfig);
      });
    }
  });
};

AppMbaasSchema.methods.removeDb = function(fhconfig, cb){
  var appName = this.name;
  logger.info({app: appName}, 'remove db for app');

  //If the app was never migrated, the per-app database will never have existed.
  if(!this.migrated){
    return cb();
  }

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

/**
 * Checking if the app database has already been migrated.
 */
AppMbaasSchema.methods.isDbMigrated = function(){
  return this.migrated === true;
};

/**
 * Checking if the app database has already been created.
 * If the db config is already specified, it already has been created
 */
AppMbaasSchema.methods.isAppDbCreated = function(){
  return _.has(this.dbConf, "host");
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