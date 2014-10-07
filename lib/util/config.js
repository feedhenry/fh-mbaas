var fs = require('fs');
var configvalidate = require('./configvalidation.js');
var config;
var util = require('util');

function setConfig(cfg) {
  config = cfg;
}

// If config hasn't been previously set (which can happen in the tests for example),
// then we load in ../config/dev.json by default (or the 'conf_file' env setting if set).
function getConfig() {
  if (config) return config;

  var configFile = process.env.conf_file || './config/dev.json';
  var buf = fs.readFileSync(configFile);
	config = JSON.parse(buf.toString());
  configvalidate.configvalidation(config);

  return config;
}

//return the mongo db urls for mongoose connection
function getMongooseUrl() {
  var config = getConfig();
  var mongoConf = config.fhmbaas.mongo;
  var hosts = mongoConf.host.split(',');
  var ports = [mongoConf.port];
  if(typeof mongoConf.port === 'string'){
    ports = mongoConf.port.split(',');
  }
  var urls = [];
  for(var i=0;i<hosts.length;i++){
    var host = hosts[i].replace(/\s/g, '');
    var port = ports.length === 1? ports[0]: ports[i];
    if(typeof port === 'string'){
      port = port.replace(/\s/g, '');
    }
    var url = util.format('mongodb://%s:%s', host, port);
    if(i === 0){
      //for mongoose, only the first url should contain user auth info and db name
      url = util.format('mongodb://%s:%s/%s', host, port, mongoConf.name);
      if(mongoConf.auth && mongoConf.auth.enabled){
        url = util.format('mongodb://%s:%s@%s:%s/%s', mongoConf.auth.user, mongoConf.auth.pass, host, port, mongoConf.name);
      }
    }
    urls.push(url);
  }
  return urls.length === 1? urls[0]: urls.join(',');
}

//check if the settings for the key path is true-ish
function yes(key){
  var keys = key.split('.');
  var config = getConfig();
  for(var i=0;i<keys.length;i++){
    if(config){
      config = config[keys[i]];
    } else {
      break;
    }
  }
  return config === true || config === 'true';
}

exports.setConfig = setConfig;
exports.getConfig = getConfig;
exports.getMongooseUrl = getMongooseUrl;
exports.yes = yes;
