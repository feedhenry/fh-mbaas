var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var timestamps = require('mongoose-timestamp');
var logger = require('fh-config').getLogger();
var common = require('../util/common');
var mongo = require('../util/mongo');

/**
 * A model that is used to save MBaas related information for an environment.
 * @type {Schema}
 */
var MbaasSchema = new Schema({
  'domain': {
    type: String,
    required: true
  },
  'environment': {
    type: String,
    required: true
  },
  'dbConf': {
    type: Schema.Types.Mixed,
    required: true
  }
}, {collection: 'mbaas'});

MbaasSchema.index({domain: 1, environment: 1}, {unique:true});

function getDomainDbConf(domain, env, fhconfig){
  var db_name = domain + '_' + env;
  var db = {
    host: fhconfig.value('mongo.host'),
    port: fhconfig.value('mongo.port'),
    name: db_name,
    user: db_name,
    pass: common.randomPassword()
  };
  return db;
}

MbaasSchema.statics.createModel = function(domain, env, fhconfig, cb){
  logger.info({domain: domain, env: env}, 'try create mbaas instance');
  var dbConf = getDomainDbConf(domain, env, fhconfig);
  this.create({domain: domain, environment: env, dbConf: dbConf}, function(err, savedInstance){
    if(err) return cb(err);
    logger.trace({domain: domain, env: env}, 'mbaas instance created');
    return cb(null, savedInstance);
  });
};

MbaasSchema.methods.createDb = function(fhconfig, cb){
  var domain = this.domain;
  var env = this.environment;
  var db = this.dbConf;
  logger.info({domain: domain, env: env, db: db}, 'try to create database for the environment');
  try{
    common.checkDbConf(db);
  }catch(e){
    logger.info({db: db}, 'db validation failed');
    return cb(e);
  }
  
  mongo.createDb(fhconfig, db.user, db.pass, db.name, function(err){
    if(err){
      logger.error(err, 'Failed to create db : %s.', db.name);
      return cb(err);
    } else {
      logger.info({db: db.name, user: db.user}, 'Database created');
      return cb(null, db);
    }
  });
};


MbaasSchema.plugin(timestamps, {
  createdAt: 'created',
  modifiedAt: 'modified'
});

module.exports = MbaasSchema;