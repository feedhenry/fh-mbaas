
module.exports = {
  "mongo": {
    "enabled": true,
    "name": "fh-mbaas",
    "host": "localhost",
    "port": 27017,
    "replicaset_name": null,
    "auth": {
      "enabled": false,
      "user": "",
      "pass": ""
    },
    "admin_auth": {
      "user": "u-mbaas",
      "pass": "password"
    }
  },
  "fhditch": {
    "host": "localhost",
    "port": 8802,
    "protocol": "http"
  },
  "fhdfc": {
    "dynofarm": "http://localhost:9000",
    "username":"feedhenry",
    "_password": "feedhenry101",
    "loglevel": "warn",
    "cache_timeout": 300000
  },
  "fhamqp":{
    "enabled": true,
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
  "fhmbaas": {
    "mbaasid":"development",
    "pagination": {
      "maxLimit": 20
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
    "files":{
      "recovery_file":"../messages/recovery.log",
      "backup_file":"../messages/backup.log"
    }
  },
  "fhstats":{
    "enabled": false,
    "host":"localhost",
    "port": 8804,
    "protocol": "http",
    "apikey": "12345"
  },
  "fhredis":{
    "host": "127.0.0.1",
    "port": 6379,
    "password":""
  }
};
