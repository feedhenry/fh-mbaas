var fs = require('fs');
var configvalidate = require('./configvalidation.js');
var config;

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

exports.setConfig = setConfig;
exports.getConfig = getConfig;
