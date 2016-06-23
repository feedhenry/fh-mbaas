var common = require('../util/common');
var url = require('url');
var appEnv = require('fh-mbaas-middleware').appEnv;

function _parseMbaasUrl(mbaasUrl) {
  mbaasUrl = url.parse(mbaasUrl);
  var mbaasProtocol = mbaasUrl.protocol ? mbaasUrl.protocol : "https";
  mbaasProtocol = mbaasProtocol.replace(":", "");

  return {
    host: mbaasUrl.host,
    protocol: mbaasProtocol
  };
}

/**
 * Getting Environment Variables For A Dynofarm App.
 * @param params
 * @returns {{}}
 */
function getFeedhenryEnvVars(params) {
  var appMbaas = params.appMbaas;
  var fhconfig = params.fhconfig;

  var mbaasUrl = _parseMbaasUrl(appMbaas.mbaasUrl);

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
  if (fhconfig.value('fhredis.password') && fhconfig.value('fhredis.password') !== '') {
    appEnvs.FH_REDIS_PASSWORD = fhconfig.value('fhredis.password');
  }
  appEnvs.LD_LIBRARY_PATH = '/opt/instantclient/'; //legacy env var

  //Only apps that have been migrated to their own database will get this environment variable
  if (appMbaas.migrated) {
    appEnvs.FH_MONGODB_CONN_URL = common.formatDbUri(appMbaas.dbConf);
  }

  //Prototcol For Calling Mbaas From Apps
  appEnvs.FH_MBAAS_PROTOCOL = mbaasUrl.protocol || "https";
  //App Mbaas Host. Used for apps calling mbaas hosts.
  appEnvs.FH_MBAAS_HOST = mbaasUrl.host;
  //Access key to verify apps calling Mbaas App APIs.
  appEnvs.FH_MBAAS_ENV_ACCESS_KEY = appMbaas.accessKey;
  appEnvs.FH_MBAAS_ID = fhconfig.value("fhmbaas.mbaasid");

  //If the app is a service, ensure the FH_SERVICE_ACCESS_KEY env var is set.
  //This will allow authorised data sources to access the service using the X-FH-SERViCE-ACCESS-KEY header.
  if (appMbaas.isServiceApp) {
    appEnvs.FH_SERVICE_ACCESS_KEY = appMbaas.serviceAccessKey;
  }

  return appEnvs;
}

function getOpenshift3Envars(params) {
  var fhconfig = params.fhconfig;
  var appMbaas = params.appMbaas;

  var mbaasUrl = _parseMbaasUrl(appMbaas.mbaasUrl);

  var appEnvs = {};
  appEnvs.FH_MBAAS_PROTOCOL = mbaasUrl.protocol;
  //App Mbaas Host. Used for apps calling mbaas hosts.
  appEnvs.FH_MBAAS_HOST = mbaasUrl.host;
  //Access key to verify apps calling Mbaas App APIs.
  appEnvs.FH_MBAAS_ENV_ACCESS_KEY = appMbaas.accessKey;
  appEnvs.FH_MESSAGING_REALTIME_ENABLED = fhconfig.bool('fhmessaging.realtime');
  appEnvs.FH_MESSAGING_ENABLED = fhconfig.bool('fhmessaging.enabled');
  appEnvs.FH_MESSAGING_HOST = fhconfig.value('fhmessaging.host');
  appEnvs.FH_MESSAGING_CLUSTER = fhconfig.value('fhmessaging.cluster');
  appEnvs.FH_MBAAS_ID = fhconfig.value("fhmbaas.mbaasid");
  appEnvs.FH_STATS_HOST = fhconfig.value("fhstats.host");
  appEnvs.FH_STATS_PORT = fhconfig.value("fhstats.udp.port");
  appEnvs.FH_STATS_ENABLED = fhconfig.value("fhstats.enabled");
  appEnvs.FH_STATS_PROTOCOL = fhconfig.value("fhstats.udp.protocol");

  //If the app is a service, ensure the FH_SERVICE_ACCESS_KEY env var is set.
  //This will allow authorised data sources to access the service using the X-FH-SERViCE-ACCESS-KEY header.
  if (appMbaas.isServiceApp) {
    appEnvs.FH_SERVICE_ACCESS_KEY = appMbaas.serviceAccessKey;
  }

  return appEnvs;
}

module.exports = {
  feedhenry: getFeedhenryEnvVars,
  openshift: appEnv.openshift,
  openshift3: getOpenshift3Envars
};
