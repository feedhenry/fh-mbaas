var dbConf = {
  host: 'localhost',
  port: 27017,
  name: 'test',
  user: 'testuser',
  pass: 'testpass'
};

var fhconfig = require('fh-config');
fhconfig.setRawConfig({
  fhmbaas:{
    key:'testkey',
    protocol: 'https'
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
    port:8803,
    protocol:'http'
  },
  fhdfc:{
    "dynofarm":'http://localhost:9000',
    "username":"fh",
    "_password": "fh",
    "loglevel": "warn"
  },
  fhamqp:{
    "enabled": false,
    "max_connection_retry": 10,
    "nodes":"localhost:5672",
    "ssl": false,
    "vhosts":{
      "events":{
        "name":"fhevents",
        "user":"fheventuser",
        "password":"fheventpassword"
      }
    },
    "app":{
      "enabled": false
    }
  },
  fhmessaging:{
    "enabled": false,
    "host":"localhost",
    "protocol":"http",
    "port":8803,
    "path":"msg/TOPIC",
    "cluster":"development",
    "realtime": false,
    "files":{
      "recovery_file":"../messages/recovery.log",
      "backup_file":"../messages/backup.log"
    }
  },
  fhstats:{
    "enabled": false,
    "host":"localhost",
    "port": 8804,
    "protocol": "http"
  }
});

var appEnv = require('../../../lib/models/appEnv');
var assert = require('assert');

exports.test_app_envs = function(finish){
  var params = {
    mbaas: {dbConf: dbConf},
    appMbaas: {
      dbConf: dbConf,
      isDbMigrated: function(){
        return true;
      },
      accessKey: "somembaasaccesskey",
      type: 'feedhenry',
      mbaasUrl: "https://mbaas.somembaas.com"
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
  assert.equal(envs.FH_DITCH_PORT, 8803);
  assert.equal(envs.FH_DITCH_PROTOCOL, 'http');

  assert.equal(envs.FH_MESSAGING_BACKUP_FILE, '../messages/backup.log');
  assert.equal(envs.FH_MESSAGING_CLUSTER, 'development');
  assert.equal(envs.FH_MESSAGING_ENABLED, false);
  assert.equal(envs.FH_MESSAGING_HOST, 'localhost');
  assert.equal(envs.FH_MESSAGING_PROTOCOL, 'http');
  assert.equal(envs.FH_MESSAGING_REALTIME_ENABLED, false);
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

  finish();
};