#!/usr/bin/env node

var TITLE = "fh-mbaas";
process.env.component = TITLE;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
if (!process.env.conf_file) process.env.conf_file = process.argv[2];

var util = require('util');
var args = require('optimist').argv;
var fs = require('fs');
var path = require('path');
var cluster = require('cluster');
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var fhconfig = require('fh-config');
var multer = require('multer');
var forms = require('fh-forms');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var requiredvalidation = require('./lib/util/requiredvalidation.js');
var fhcluster = require('fh-cluster');

// args and usage
function usage() {
  console.log("Usage: " + args.$0 + " <config file> [-d] (debug)");
  process.exit(0);
}

if (args.h) {
  usage();
}

if (args._.length < 1) {
  usage();
}

if (args.d === true) {
  console.log("STARTING ONE WORKER FOR DEBUG PURPOSES");
  startWorker();
} else {
  // Note: if required as a module, its up to the user to call start();
  if (require.main === module) {
    fhcluster(startWorker);
  }
}

function startWorker(clusterWorker) {

  // read our config file
  var configFile = process.env.conf_file || args._[0];

  fhconfig.init(configFile, requiredvalidation, function(err) {
    if (err) {
      console.error("Problems reading config file: " + configFile);
      console.error(err);
      process.exit(-1);
    }

    // Note: location/order of these requires for istanbul code coverage is important.
    if (fhconfig.bool('fhmbaas.code_coverage_enabled')) {
      var coverage = require('istanbul-middleware');
      coverage.hookLoader(__dirname);
    }

    var logger = getFhConfigLogger(fhconfig);
    setupUncaughtExceptionHandler(logger);
    setupFhconfigReloadHandler(fhconfig);

    refreshJsonConfig(fhconfig, function(jsonConfig) {
      initializeMiddlewareModule(clusterWorker, jsonConfig);
    });
  });
}

function refreshJsonConfig(fhconfig, cb) {
  var conf = fhconfig.getConfig();
  var logger = getFhConfigLogger(fhconfig);
  var jsonConfig = {
    mongoUrl: fhconfig.mongoConnectionString(),
    mongo : {
      host: conf.rawConfig.mongo.host,
      port: conf.rawConfig.mongo.port,
      name: conf.rawConfig.mongo.name,
      admin_auth: {
        user: conf.rawConfig.mongo.admin_auth.user,
        pass: conf.rawConfig.mongo.admin_auth.pass
      }
    },
    crash_monitor: conf.rawConfig.crash_monitor,
    email: conf.rawConfig.email,
    fhamqp: conf.rawConfig.fhamqp,
    logger: logger
  };
  logger.debug('JSON Config ', jsonConfig);

  return cb(jsonConfig);
}


function initializeMiddlewareModule(clusterWorker, jsonConfig) {
  // models are also initialised in this call
  fhmbaasMiddleware.init(jsonConfig, function(err) {
    if (err) {
      jsonConfig.logger.error(err);
      clusterWorker.kill();
    } else {
      startApp();
    }
  });
}

function startApp() {
  var app = express();

  // Enable CORS for all requests
  app.use(cors());

  // Parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({
    extended: false
  }));

  // Parse JSON payloads
  app.use(bodyParser.json({limit: fhconfig.value('fhmbaas.maxpayloadsize') || "20mb"}));

  //Multipart Form Request Parser
  app.use(multer({
    dest: fhconfig.value("fhmbaas.temp_forms_files_dest")
  }));

  app.use('/sys', require('./lib/handlers/sys.js')());
  app.use('/api/mbaas', require('./lib/handlers/api.js'));
  app.use('/api/app', require('./lib/handlers/app.js'));

  var port = fhconfig.int('fhmbaas.port');
  app.listen(port, function () {
    // Get our version number from package.json
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), "utf8"));
    console.log("Started " + TITLE + " version: " + pkg.version + " at: " + new Date() + " on port: " + port);
  });
}

function getFhConfigLogger(fhconfig) {
  var logger = fhconfig.getLogger();
  forms.core.setLogger(logger);
  return logger;
}

function setupFhconfigReloadHandler(fhconfig) {
  process.on(fhconfig.RELOAD_CONFIG_SIGNAL, function() {
    fhconfig.reload(cluster.workers, function(err) {
      if (err) {
        console.error("Config not reloaded");
        console.error(err);
        console.error("Please fix and try again!!");
      }
    });
  });
}

function setupUncaughtExceptionHandler(logger) {
  // handle uncaught exceptions
  process.on('uncaughtException', function(err) {
    logger.error("FATAL: UncaughtException, please report: " + util.inspect(err));
    console.error(new Date().toString() + " FATAL: UncaughtException, please report: " + util.inspect(err));
    if (err !== undefined && err.stack !== undefined) {
      logger.error(util.inspect(err.stack));
    }
    console.trace(err.stack);
    process.exit(1);
  });
}
