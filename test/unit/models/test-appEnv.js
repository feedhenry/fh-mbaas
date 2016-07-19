var fixtures = require('../../fixtures');

var dbConf = {
  host: 'localhost',
  port: 27017,
  name: 'test',
  user: 'testuser',
  pass: 'testpass'
};

var fhconfig = require('fh-config');
fhconfig.setRawConfig(fixtures.config);


var appEnv = require('../../../lib/models/appEnv');
var assert = require('assert');

exports.test_app_envs = function(finish){
  fhconfig.setRawConfig(fixtures.config);
  var params = {
    mbaas: {dbConf: dbConf},
    appMbaas: {
      dbConf: dbConf,
      migrated: true,
      accessKey: "somembaasaccesskey",
      type: 'feedhenry',
      mbaasUrl: "https://mbaas.somembaas.com",
      isServiceApp: true,
      serviceAccessKey: '1234'
    },
    fhconfig: fhconfig
  };

  var envs = appEnv[params.appMbaas.type](params);
  assert.equal(envs.FH_AMQP_APP_ENABLED, false);
  assert.equal(envs.FH_AMQP_CONN_MAX, 10);
  assert.equal(envs.FH_AMQP_NODES, 'localhost:5672');
  assert.equal(envs.FH_AMQP_VHOST, 'fhevents');
  assert.equal(envs.FH_AMQP_USER, 'fheventuser');
  assert.equal(envs.FH_AMQP_PASS, 'fheventpassword');
  
  assert.equal(envs.FH_DITCH_HOST, 'localhost');
  assert.equal(envs.FH_DITCH_PORT, 8802);
  assert.equal(envs.FH_DITCH_PROTOCOL, 'http');

  assert.equal(envs.FH_MESSAGING_BACKUP_FILE, '../messages/backup.log');
  assert.equal(envs.FH_MESSAGING_CLUSTER, 'development');
  assert.equal(envs.FH_MESSAGING_ENABLED, true);
  assert.equal(envs.FH_MESSAGING_HOST, 'localhost');
  assert.equal(envs.FH_MESSAGING_PROTOCOL, 'http');
  assert.equal(envs.FH_MESSAGING_REALTIME_ENABLED, true);
  assert.equal(envs.FH_MESSAGING_RECOVERY_FILE, '../messages/recovery.log');
  assert.equal(envs.FH_MESSAGING_SERVER, 'http://localhost:8803/msg/TOPIC');

  assert.equal(envs.FH_MONGODB_CONN_URL, 'mongodb://testuser:testpass@localhost:27017/test');

  assert.equal(envs.FH_STATS_ENABLED, false);
  assert.equal(envs.FH_STATS_HOST, 'localhost');
  assert.equal(envs.FH_STATS_PORT, 8804);
  assert.equal(envs.FH_STATS_PROTOCOL, 'http');


  //Checking mbaas data checked
  assert.equal(envs.FH_MBAAS_HOST, "mbaas.somembaas.com");
  assert.equal(envs.FH_MBAAS_PROTOCOL, "https");
  assert.equal(envs.FH_MBAAS_ENV_ACCESS_KEY, "somembaasaccesskey");
  assert.equal(envs.FH_MBAAS_ID, "development");

  assert.equal(params.appMbaas.serviceAccessKey, envs.FH_SERVICE_ACCESS_KEY);

  finish();
};


exports.test_app_env_os3 = function(finish){
  var params = {
    mbaas: {dbConf: dbConf},
    appMbaas: {
      dbConf: dbConf,
      migrated: true,
      accessKey: "somembaasaccesskey",
      type: 'openshift3',
      mbaasUrl: "https://mbaas.somembaas.com"
    },
    fhconfig: fhconfig
  };

  var envs = appEnv[params.appMbaas.type](params);
  assert.equal(envs.FH_MESSAGING_CLUSTER, 'development');
  assert.equal(envs.FH_MESSAGING_ENABLED, true);
  assert.equal(envs.FH_MESSAGING_HOST, 'localhost');
  assert.ok(envs.hasOwnProperty("FH_MESSAGING_REALTIME_ENABLED"));
  //Checking mbaas data checked
  assert.equal(envs.FH_MBAAS_HOST, "mbaas.somembaas.com");
  assert.equal(envs.FH_MBAAS_PROTOCOL, "https");
  assert.equal(envs.FH_MBAAS_ENV_ACCESS_KEY, "somembaasaccesskey");
  assert.equal(envs.FH_MBAAS_ID, "development");
  finish();
};


exports.test_service_env_os3 = function(finish){
  var params = {
    mbaas: {dbConf: dbConf},
    appMbaas: {
      dbConf: dbConf,
      migrated: true,
      accessKey: "somembaasaccesskey",
      type: 'openshift3',
      mbaasUrl: "https://mbaas.somembaas.com",
      isServiceApp: true,
      serviceAccessKey: "someserviceaccesskey"
    },
    fhconfig: fhconfig
  };

  var envs = appEnv[params.appMbaas.type](params);
  assert.equal(envs.FH_MESSAGING_CLUSTER, 'development');
  assert.equal(envs.FH_MESSAGING_ENABLED, true);
  assert.equal(envs.FH_MESSAGING_HOST, 'localhost');
  assert.ok(envs.hasOwnProperty("FH_MESSAGING_REALTIME_ENABLED"));
  //Checking mbaas data checked
  assert.equal(envs.FH_MBAAS_HOST, "mbaas.somembaas.com");
  assert.equal(envs.FH_MBAAS_PROTOCOL, "https");
  assert.equal(envs.FH_MBAAS_ENV_ACCESS_KEY, "somembaasaccesskey");
  assert.equal(envs.FH_MBAAS_ID, "development");
  assert.equal(envs.FH_SERVICE_ACCESS_KEY, "someserviceaccesskey");
  finish();
};
