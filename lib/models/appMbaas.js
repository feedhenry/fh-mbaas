var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var timestamps = require('mongoose-timestamp');
var logger = require('../util/logger').getLogger();
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
  'locked': {
    type: Boolean,
    'default': false
  },
  'migrated': {
    type:Boolean,
    'default': false
  },
  'dbConf': Schema.Types.Mixed
}, {collection: 'appmbaas'});

AppMbaasSchema.statics.findOrCreateByName = function(appName, domain, env, cb){
  logger.info({app: appName}, 'try to find or create AppMbaas instance');
  var self = this;
  this.findOne({
    'name': appName
  }, function(err, appMbaas){
    if(err) return cb(err);
    if(appMbaas){
      logger.trace({app: appName}, 'AppMbaas instance found');
      return cb(null, appMbaas);
    } else {
      self.create({
        'name': appName,
        'domain': domain,
        'environment':env
      }, function(err, newInstance){
        if(err) return cb(err);
        logger.trace({app: appName}, 'AppMbaas instance created');
        return cb(null, newInstance);
      });
    }
  });
};

AppMbaasSchema.methods.lock = function(cb){
  if(!this.locked){
    this.locked = true;
    this.save(function(err){
      if(err) return cb(err);
      return cb();
    });
  } else {
    return cb();
  }
};

AppMbaasSchema.methods.unlock = function(cb){
  if(this.locked){
    this.locked = false;
    this.save(function(err){
      if(err) return cb(err);
      return cb();
    });
  } else {
    return cb();
  }
};

AppMbaasSchema.methods.createDb = function(cfg, cb){
  var appName = this.name;
  logger.info({app: appName}, 'try to create database for app');
  if(this.dbConf && this.dbConf.user){
    logger.trace(this.dbConf, 'db is already created for app : %s', appName);
    var dbConf = this.dbConf;
    process.nextTick(function(){
      return cb(null, dbConf);
    });
  } else {
    logger.trace({app: appName}, 'db is not created. Creating now');
    var db_name = appName;
    var user = common.randomUser();
    var pass = common.randomPassword();
    var db = {
      host: cfg.mongo.host,
      port: cfg.mongo.port,
      name: db_name,
      user: user,
      pass: pass
    };
    this.dbConf = db;
    this.markModified('dbConf');
    this.save(function(err, saved){
      if(err){
        logger.error(err, 'Failed to save dbConf: %s', appName);
        return cb(err);
      }
      var adminDbOpts = {
        host: cfg.mongo.host,
        port: cfg.mongo.port,
        user: cfg.mongo.admin_auth.user,
        pass: cfg.mongo.admin_auth.pass
      };
      mongo.createDb(adminDbOpts, db.user, db.pass, db.name, function(err){
        if(err){
          logger.error(err, 'Failed to create db for app %s', appName);
          saved.dbConf = null;
          saved.markModified('dbConf');
          saved.save(function(rbError){
            if(rbError){
              logger.error(rbError, 'Failed to rollback for app %s', appName);
              return cb(rbError);
            } else {
              return cb(err);
            }
          });
        } else {
          logger.info({app: appName}, 'Database created');
          return cb(null, saved.dbConf);
        }
      });
    });
  }
};

AppMbaasSchema.methods.removeDb = function(cfg, cb){
  var appName = this.name;
  logger.info({app: appName}, 'remove db for app');
  if(this.dbConf && this.dbConf.user){
    var adminDbOpts = {
      host: cfg.mongo.host,
      port: cfg.mongo.port,
      user: cfg.mongo.admin_auth.user,
      pass: cfg.mongo.admin_auth.pass
    };
    mongo.dropDb(adminDbOpts, this.dbConf.user, this.dbConf.name, function(err){
      if(err) return cb(err);
      logger.trace({app:appName}, 'app db is dropped');
      return cb();
    });
  } else {
    logger.trace({app:appName}, 'app has no db');
    return cb();
  }
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
  if(this.migrated){
    logger.trace({app: appName}, 'App db is already migrated');
    return cb();
  } else {
    if(this.locked){
      logger.trace({app:appName}, 'Migration is in progress');
      return cb(new Error('app db migration is in process'));
    } else {
      this.lock(function(){
        logger.info({app: appName}, 'Migrate App db');
        ditchhelper.doMigrate(self.domain, self.environment, appName, cacheKey, appGuid, cb);
      });
    }
  }
};

AppMbaasSchema.methods.completeMigrate = function(cacheKey, appGuid, cb){
  var appName = this.appName;
  var self = this;
  if(this.locked){
    this.migrated = true;
    this.unlock(function(){
      logger.info({app:appName}, 'Complete app db migration');
      ditchhelper.migrateComplete(self.domain, self.environment, appName, cacheKey, appGuid, function(){
        //don't care about errors
        cb();
      });
    });
  } else {
    cb();
  }
};

AppMbaasSchema.plugin(timestamps, {
  createdAt: 'created',
  modifiedAt: 'modified'
});

module.exports = AppMbaasSchema;