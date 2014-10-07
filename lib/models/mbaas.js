var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var timestamps = require('mongoose-timestamp');
var logger = require('../util/logger').getLogger();
var common = require('../util/common');
var mongo = require('../util/mongo');

var MbaasSchema = new Schema({
  'domain': {
    type: String,
    required: true,
  },
  'environment': {
    type: String,
    required: true
  },
  'dbConf': Schema.Types.Mixed
}, {collection: 'mbaas'});

MbaasSchema.statics.findOrCreateByDomainEnv = function(domain, env, cb){
  logger.info({domain: domain, env: env}, 'try to find or create mbaas instance');
  var self = this;
  this.findOne({
    'domain': domain,
    'environment': env
  }, function(err, mbaas){
    if(err) return cb(err);
    if(mbaas){
      logger.trace({domain: domain, env: env}, 'mbaas instance found');
      return cb(null, mbaas);
    } else {
      logger.trace({domain: domain, env: env}, 'creating new mbaas instance');
      self.create({domain: domain, environment: env}, function(err, savedInstance){
        if(err) return cb(err);
        logger.trace({domain: domain, env: env}, 'mbaas instance created');
        return cb(null, savedInstance);
      });
    }
  });
};

MbaasSchema.methods.createDomainDBForEnv = function(domain, env, cfg, cb){
  logger.info({domain: domain, env: env}, 'try to create database for the environment');
  if(this.dbConf && this.dbConf.user){
    logger.trace(this.dbConf, 'db is already created : domain = %s ~ env = %s', domain, env);
    var dbConf = this.dbConf;
    process.nextTick(function(){
      return cb(null, dbConf);
    });
  } else {
    logger.trace('db is not created. Creating now');
    var db_name = domain + '_' + env;
    var db = {
      host: cfg.mongo.host,
      port: cfg.mongo.port,
      name: db_name,
      user: db_name,
      pass: common.randomPassword()
    };

    //save the dbConf immedietaly so that no other calls will create another database
    this.dbConf = db;
    this.markModified('dbConf');
    this.save(function(err, saved){
      if(err){
        logger.error(err, 'Failed to save dbConf : domain = %s ~ env = %s', domain, env);
        return cb(err);
      }

      //now create the db
      var adminDbOpts = {
        host: cfg.mongo.host,
        port: cfg.mongo.port,
        user: cfg.mongo.admin_auth.user,
        pass: cfg.mongo.admin_auth.pass
      };

      mongo.createDb(adminDbOpts, db.user, db.pass, db.name, function(err){
        if(err){
          logger.error(err, 'Failed to create db : %s. Rolling back mbaas instance.', db.name);
          saved.dbConf = null;
          saved.markModified('dbConf');
          saved.save(function(rbError){
            if(rbError) {
              logger.error(rbError, 'Failed to rollback');
              return cb(rbError);
            } else {
              return cb(err);
            }
          });
        } else {
          logger.info({db: db.name, user: db.user}, 'Database created');
          return cb(null, saved.dbConf);
        }
      });
    });
  }
};


MbaasSchema.plugin(timestamps, {
  createdAt: 'created',
  modifiedAt: 'modified'
});

module.exports = MbaasSchema;


