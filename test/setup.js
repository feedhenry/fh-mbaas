var fhconfig = require('fh-config');
var ditchPort = 19001;
var dynofarmPort = 19002;

var config ={
  fhmbaas:{
    key:'testkey',
    protocol: "https"
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
    port:ditchPort,
    protocol:'http'
  },
  fhdfc:{
    "dynofarm":'http://localhost:' + dynofarmPort,
    "username":"fh",
    "_password": "fh",
    "cache_timeout": 30000,
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
  "fhmessaging":{
    "enabled": true,
    "host":"localhost",
    "protocol":"http",
    "port":8803,
    "path":"msg/TOPIC",
    "cluster":"development",
    "realtime": false,
    "apikey":"secretkey",
    "files":{
      "recovery_file":"../messages/recovery.log",
      "backup_file":"../messages/backup.log"
    }
  },
  "fhmetrics" :{
    "host":"127.0.0.1",
    "port":"8813",
    "protocol":"http",
    "apikey":"somekey"
  },
  fhstats:{
    "enabled": false,
    "host":"localhost",
    "port": 8804,
    "protocol": "http"
  }
};

fhconfig.setRawConfig(config);

module.exports.setUp = function(done){
  done();
};

module.exports.config = config;
module.exports.dynofarmPort = dynofarmPort;
module.exports.ditchPort = ditchPort;