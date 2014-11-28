var common = require('../util/common');
var url = require('url');

module.exports = function getEnvs(mbaas, appMbaas, fhconfig){
  var appEnvs = {};
  appEnvs.FH_AMQP_APP_ENABLED = fhconfig.bool('fhamqp.app.enabled');
  appEnvs.FH_AMQP_CONN_MAX = fhconfig.int('fhamqp.max_connection_retry');
  appEnvs.FH_AMQP_NODES = fhconfig.value('fhamqp.nodes');
  appEnvs.FH_AMQP_VHOST = fhconfig.value('fhamqp.vhosts.events.name');
  appEnvs.FH_AMQP_USER = fhconfig.value('fhamqp.vhosts.events.user');
  appEnvs.FH_AMQP_PASS = fhconfig.value('fhamqp.vhosts.events.password');
  appEnvs.FH_DITCH_HOST = fhconfig.value('fhditch.host');
  appEnvs.FH_DITCH_PORT = fhconfig.int('fhditch.port');
  appEnvs.FH_DITCH_PROTOCOL = fhconfig.value('fhditch.protocol');
  appEnvs.FH_MESSAGING_BACKUP_FILE = fhconfig.value('fhmessaging.files.backup_file');
  appEnvs.FH_MESSAGING_CLUSTER = fhconfig.value('fhmessaging.cluster');
  appEnvs.FH_MESSAGING_ENABLED = fhconfig.bool('fhmessaging.enabled');
  appEnvs.FH_MESSAGING_HOST = fhconfig.value('fhmessaging.host');
  appEnvs.FH_MESSAGING_PROTOCOL = fhconfig.value('fhmessaging.protocol');
  appEnvs.FH_MESSAGING_REALTIME_ENABLED = fhconfig.bool('fhmessaging.realtime');
  appEnvs.FH_MESSAGING_RECOVERY_FILE = fhconfig.value('fhmessaging.files.recovery_file');
  appEnvs.FH_MESSAGING_SERVER = url.format({
    protocol: fhconfig.value('fhmessaging.protocol'), 
    hostname: fhconfig.value('fhmessaging.host'),
    port: fhconfig.int('fhmessaging.port'),
    pathname: fhconfig.value('fhmessaging.path')
  });
  appEnvs.FH_STATS_ENABLED = fhconfig.bool('fhstats.enabled');
  appEnvs.FH_STATS_HOST = fhconfig.value('fhstats.host');
  appEnvs.FH_STATS_PORT = fhconfig.int('fhstats.port');
  appEnvs.FH_STATS_PROTOCOL = fhconfig.value('fhstats.protocol');
  appEnvs.FH_REDIS_HOST = fhconfig.value('fhredis.host');
  appEnvs.FH_REDIS_PORT = fhconfig.int('fhredis.port');
  if(fhconfig.value('fhredis.password') && fhconfig.value('fhredis.password') !== ''){
    appEnvs.FH_REDIS_PASSWORD = fhconfig.value('fhredis.password');
  }
  appEnvs.LD_LIBRARY_PATH = '/opt/instantclient/'; //legacy env var
  if(mbaas){
    appEnvs.FH_DOMAIN_DATABASE = common.formatDbUri(mbaas.dbConf);
  }
  if(appMbaas){
    appEnvs.FH_MONGODB_CONN_URL = common.formatDbUri(appMbaas.dbConf);
  }
  return appEnvs;
};