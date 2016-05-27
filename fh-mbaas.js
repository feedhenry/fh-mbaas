#!/usr/bin/env node

var TITLE = "fh-mbaas";
process.env.component = TITLE;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
if (!process.env.conf_file) process.env.conf_file = process.argv[2];

var util = require('util');
var args = require('optimist').argv;
var fs = require('fs');
var path = require('path');
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var fhconfig = require('fh-config');
var multer = require('multer');
var forms = require('fh-forms');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var fhServiceAuth = require('fh-service-auth');
var requiredvalidation = require('./lib/util/requiredvalidation.js');
var logger;
var scheduler;
var fhComponentMetrics = require('fh-component-metrics');
var fhcluster = require('fh-cluster');
var cluster = require('cluster');
var formsUpdater = require('./lib/formsUpdater');
var fhlogger = require('fh-logger');
var amqp = require('./lib/util/amqp.js');

var async = require('async');
var models = require('./lib/models');



var START_AGENDA = "startAgenda";

// args and usage
function usage() {
  console.log("Usage: " + args.$0 + " <config file> [-d] (debug) --master-only --workers=[int] \n --master-only will override  --workers so should not be used together");
  process.exit(0);
}

if (args.h) {
  usage();
}

if (args._.length < 1) {
  usage();
}

//Loading The Config First
loadConfig(function() {
  if (args.d === true || args["master-only"] === true) {

    console.log("starting single master process");
    startWorker();
  } else {
    var preferredWorkerId = fhconfig.value('agenda.preferredWorkerId');
    // Note: if required as a module, its up to the user to call start();
    if (require.main === module) {
      var numWorkers = args["workers"];
      fhcluster(startWorker, numWorkers, undefined, [
        {
          workerFunction: initializeScheduler,
          startEventId: START_AGENDA,
          preferredWorkerId: preferredWorkerId
        }
      ]);
    }
  }
});

/**
 * Loading Mondule Config From File System
 * @param cb
 */
function loadConfig(cb){
  // read our config file
  var configFile = process.env.conf_file || args._[0];

  fhconfig.init(configFile, requiredvalidation, function(err){
    if(err){
      console.error("Problems reading config file: " + configFile);
      console.error(err);
      process.exit(-1);
    }
    createAndSetLogger();
    cb();
  });
}

function createAndSetLogger() {
  // We are overwriting any logger created in fhconfig.init and replacing
  // it with an fh-logger instance to allow the underlying logger to be
  // controlled (setting log levels for example)
  logger = fhlogger.createLogger(fhconfig.getConfig().rawConfig.logger);
  fhconfig.setLogger(logger);
  forms.core.setLogger(logger);

  //Setting global forms config
  logger.debug("minsPerBackOffIndex", fhconfig.int('fhmbaas.dsMinsPerBackOffIndex'));
  forms.core.setConfig({
    minsPerBackOffIndex: fhconfig.int('fhmbaas.dsMinsPerBackOffIndex')
  });
}

/**
 * Initialising The Scheduler. This is bound to a single worker using fh-cluster.
 * @param clusterWorker
 */
function initializeScheduler(clusterWorker) {
  //Ensuring that the config is loaded.
  initModules(clusterWorker, getMbaasMiddlewareConfig(), function() {
    logger.info("Initialising scheduler ", clusterWorker.id, clusterWorker.process.pid);
    scheduler = formsUpdater.scheduler(logger, fhconfig.getConfig().rawConfig, fhconfig.mongoConnectionString());
    logger.info("Initialised scheduler", scheduler);
    var appDataExportAgenda = require('./lib/export');
    appDataExportAgenda.scheduler().start();
  });
}

function startWorker(clusterWorker) {

  // Note: location/order of these requires for istanbul code coverage is important.
  if (fhconfig.bool('fhmbaas.code_coverage_enabled')) {
    var coverage = require('istanbul-middleware');
    coverage.hookLoader(__dirname);
  }

  setupUncaughtExceptionHandler(logger);
  setupFhconfigReloadHandler(fhconfig);

  if (fhconfig.bool('component_metrics.enabled')) {
    initComponentMetrics(fhconfig.value('component_metrics'));
  }

  initModules(clusterWorker, getMbaasMiddlewareConfig(), startApp);
}

function initComponentMetrics(metricsConf) {
  var metrics = fhComponentMetrics(metricsConf);

  metrics.memory(TITLE, { interval: 2000 }, function(err) {
    if (err) {
      logger.warn(err);
    }
  });

  metrics.cpu(TITLE, { interval: 1000 }, function(err) {
    if (err) {
      logger.warn(err);
    }
  });
}
function getMbaasMiddlewareConfig() {
  var conf = fhconfig.getConfig();
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

  return jsonConfig;
}

function initModules(clusterWorker, jsonConfig, cb) {
  async.parallel([
    async.apply(async.waterfall, [
      async.constant(jsonConfig),
      fhmbaasMiddleware.init,
      models.init
    ]),
    async.apply(initAmqp, jsonConfig),
    async.apply(fhServiceAuth.init, {logger: logger})
  ], function(err) {
    if (!err) {
      return cb();
    }
    logger.error(err);
    if(clusterWorker) {
      clusterWorker.kill();
    } else {
      process.exit(1);
    }
  });
}

function initAmqp(config, cb) {
  var migrationStatusHandler = require('./lib/messageHandlers/migrationStatusHandler.js');
  var deployStatusHandler = require('./lib/messageHandlers/deployStatusHandler.js');

  var amqpConnection = amqp.connect(config);
  deployStatusHandler.listenToDeployStatus(amqpConnection, config, function() {
    migrationStatusHandler.listenToMigrationStatus(amqpConnection, config);
    cb();
  });
}

function startApp( ) {
  var app = express();

  if (fhconfig.bool('component_metrics.enabled')) {
    app.use(fhComponentMetrics.timingMiddleware(TITLE, fhconfig.value('component_metrics')));
  }
  // Enable CORS for all requests
  app.use(cors());

  // Request logging
  app.use(require('express-bunyan-logger')({ logger: logger, parseUA: false }));

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
  app.use('/api/storage', require('./lib/storage').router);

  var port = fhconfig.int('fhmbaas.port');
  app.listen(port, function() {
    // Get our version number from package.json
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), "utf8"));
    console.log("Started " + TITLE + " version: " + pkg.version + " at: " + new Date() + " on port: " + port);
  });
}

function setupFhconfigReloadHandler(fhconfig) {
  process.on(fhconfig.RELOAD_CONFIG_SIGNAL, function() {
    fhconfig.reload(cluster.workers, function(err) {
      if (err) {
        console.error("Config not reloaded");
        console.error(err);
        console.error("Please fix and try again!!");
      }
      createAndSetLogger();
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
