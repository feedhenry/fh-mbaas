var validateConfig = require('../lib/util/configvalidation.js');
var path = require('path');
var fs = require('fs');
if(!fs.existsSync) fs.existsSync = path.existsSync;

var config = "/etc/feedhenry/fh-mbaas/conf.json";
var configExists = true;
if (!fs.existsSync(config)){
  config = path.resolve("./config/dev.json");
  if (!fs.existsSync(config)) {
    configExists = false;
  }
}

if (configExists === true) {
  console.log("CONFIG SET TO "+config);
  console.log("VALIDATING CONFIG");
  validateConfig.configvalidation(require(config));
}else {
  console.log("Warning: no config file found in /etc/feedhenry/fh-mbaas or in ./config!");
}
