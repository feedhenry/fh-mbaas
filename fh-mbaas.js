#!/usr/bin/env node

var TITLE = "fh-mbaas";
process.env.component = TITLE;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
if (!process.env.conf_file) {
  process.env.conf_file = process.argv[2];
}

var util = require('util');
var args = require('optimist').argv;
var fs = require('fs');
var path = require('path');
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var fhconfig = require('fh-config');
var forms = require('fh-forms');
var fhmbaasMiddleware = require('fh-mbaas-middleware');
var fhServiceAuth = require('fh-service-auth');
var requiredvalidation = require('./lib/util/requiredvalidation.js');
var log = require('./lib/util/logger');
var scheduler;
var logger;
var fhComponentMetrics = require('fh-component-metrics');
var fhcluster = require('fh-cluster');
var cluster = require('cluster');
var formsUpdater = require('./lib/formsUpdater');
var fhlogger = require('fh-logger');
var amqp = require('./lib/util/amqp.js');
var mongoUtils = require('./lib/util/mongo');

var async = require('async');
var models = require('./lib/models');
var mongoose = require('mongoose');

var mongooseConnection;



var START_AGENDA = "startAgenda";

var initModulesCalled = false;

// args and usage
function usage() {
  /* eslint-disable no-console */
  console.log("Usage: " + args.$0 + " <config file> [-d] (debug) --master-only --workers=[int] \n --master-only will override  --workers so should not be used together");
  /* eslint-enable no-console */
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

    /* eslint-disable no-console */
    console.log("starting single master process");
    /* eslint-enable no-console */
    startWorker();
    initializeScheduler();
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
 * Print out the given message and error, and exit the process with error code.
 */
function printErrorAndExit(message, err) {
  /* eslint-disable no-console */
  console.error(message);
  console.error(err);
  /* eslint-enable no-console */
  process.exit(-1);
}

/**
 * Loading Module Config From File System
 * @param cb
 */
function loadConfig(cb) {
  // read our config file
  var configFile = process.env.conf_file || args._[0];

  fhconfig.init(configFile, requiredvalidation, function(err) {
    if (err) {
      return printErrorAndExit("Problems reading config file: " + configFile, err);
    }
    createAndSetLogger();
    //we call the ensureFormsUserExists function here as we only want to call it once. No point to call it in every worker.
    ensureFormsUserExists(function(err) {
      if (err) {
        return printErrorAndExit("failed creating mongodb user for forms", err);
      }
      return cb();
    });
  });
}

function createAndSetLogger() {
  // We are overwriting any logger created in fhconfig.init and replacing
  // it with an fh-logger instance to allow the underlying logger to be
  // controlled (setting log levels for example)
  logger = fhlogger.createLogger(fhconfig.getConfig().rawConfig.logger);

  log.setLogger(logger);

  //Setting up namespace for the logger. This allows the logger to track request IDs
  //when mongoose queries have completed.
  var clsMongoose = require('fh-cls-mongoose');
  var loggerNamespace = logger.getLoggerNamespace();
  clsMongoose(loggerNamespace, mongoose);

  fhconfig.setLogger(logger);
}

/**
 * Make sure the mongodb user for forms exists.
 */
function ensureFormsUserExists(cb) {
  var mongoConfig = fhconfig.getConfig().rawConfig.mongo;
  var mongoAdminDbUrl = mongoUtils.getAdminDbUrl(fhconfig.mongoConnectionString(), mongoConfig.admin_auth);
  mongoUtils.createDbUser(mongoAdminDbUrl, {username: mongoConfig.form_user_auth.user, password: mongoConfig.form_user_auth.pass, roles: ['readWriteAnyDatabase']}, cb);
}

/**
 * Initialise the fh-forms module.
 */
function initFormsModule(formsModule, logger, cb) {
  var mongoConfig = fhconfig.getConfig().rawConfig.mongo;
  //Setting logger for fh-forms
  formsModule.init(logger);
  formsModule.setupSharedMongoConnections(logger, fhconfig.mongoConnectionString(),{auth: mongoConfig.form_user_auth, poolSize: mongoConfig.poolSize}, function(err, sharedConnections) {
    if (err) {
      logger.error("failed to setup shared mongo connections for fh-forms", {error: err});
      return cb(err);
    }
    //Setting global formsModule config
    logger.debug("minsPerBackOffIndex", fhconfig.int('fhmbaas.dsMinsPerBackOffIndex'));
    formsModule.core.setSharedConnections(sharedConnections);
    formsModule.core.setConfig({
      minsPerBackOffIndex: fhconfig.int('fhmbaas.dsMinsPerBackOffIndex')
    });
    return cb();
  });
}

/**
 * Initialising The Scheduler. This is bound to a single worker using fh-cluster.
 * @param clusterWorker
 */
function initializeScheduler(clusterWorker) {
  //Ensuring that the config is loaded.
  initModules(clusterWorker, getMbaasMiddlewareConfig(), function() {
    if (clusterWorker !== undefined) {
      logger.info("Initialising scheduler ", clusterWorker.id, clusterWorker.process.pid);
    } else {
      logger.info("Initialising scheduler.");
    }
    scheduler = formsUpdater.scheduler(logger, fhconfig.getConfig().rawConfig, fhconfig.mongoConnectionString());
    logger.info("Initialised scheduler", scheduler);
    var appDataExportAgenda = require('./lib/export');
    appDataExportAgenda.scheduler().start();
  });
}

function startWorker(clusterWorker) {

  // Note: location/order of these required for istanbul code coverage is important.
  if (fhconfig.bool('fhmbaas.code_coverage_enabled')) {
    var coverage = require('istanbul-middleware');
    coverage.hookLoader(__dirname);
  }

  setupUncaughtExceptionHandler(logger, clusterWorker);
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
      },
      replicaSet: conf.rawConfig.mongo.replicaset_name
    },
    crash_monitor: conf.rawConfig.crash_monitor,
    email: conf.rawConfig.email,
    fhamqp: conf.rawConfig.fhamqp,
    logger: logger
  };

  if (conf.rawConfig.mongo_userdb) {
    jsonConfig.mongoUserUrl = fhconfig.mongoConnectionString('mongo_userdb');
    jsonConfig.mongo_userdb = {
      host: conf.rawConfig.mongo_userdb.host,
      port: conf.rawConfig.mongo_userdb.port,
      name: conf.rawConfig.mongo_userdb.name,
      admin_auth: {
        user: conf.rawConfig.mongo_userdb.admin_auth.user,
        pass: conf.rawConfig.mongo_userdb.admin_auth.pass
      },
      replicaSet: conf.rawConfig.mongo_userdb.replicaset_name
    };
  }

  logger.debug('JSON Config ', jsonConfig);

  return jsonConfig;
}

function initModules(clusterWorker, jsonConfig, cb) {
  if (initModulesCalled) {
    return process.nextTick(() => cb());
  }
  initModulesCalled = true;
  async.parallel([
    async.apply(async.waterfall, [
      async.constant(jsonConfig),
      fhmbaasMiddleware.init
    ]),
    function initialiseModels(cb) {
      //The models should not be initialised on the mongoose connection for fh-mbaas-middleware. The document instanceof checks will not
      //pass and none of the returned models will have the correct schemas attached.
      mongooseConnection = mongoose.createConnection(fhconfig.mongoConnectionString());
      handleMongoConnectionEvents(mongooseConnection);
      models.init(mongooseConnection, cb);
    },
    async.apply(initFormsModule, forms, logger),
    async.apply(initAmqp, jsonConfig),
    async.apply(fhServiceAuth.init, {logger: logger})
  ], function(err) {
    if (!err) {
      return cb();
    }
    initModulesCalled = false;
    logger.error(err);
    if (clusterWorker) {
      clusterWorker.kill();
    } else {
      process.exit(1);
    }
  });
}

function initAmqp(config, cb) {
  var deployStatusHandler = require('./lib/messageHandlers/deployStatusHandler.js');
  var amqpConnection = amqp.connect(config);
  deployStatusHandler.listenToDeployStatus(amqpConnection, config, function() {
    cb();
  });
}

function startApp( ) {
  var app = express();

  app.use(logger.requestIdMiddleware);

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

  app.use('/sys', require('./lib/handlers/sys.js')());
  app.use('/api/mbaas', require('./lib/handlers/api.js'));
  app.use('/api/app', require('./lib/handlers/app.js'));
  app.use('/api/storage', require('./lib/storage').router);

  var port = fhconfig.int('fhmbaas.port');
  app.listen(port, function() {
    // Get our version number from package.json
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), "utf8"));
    /* eslint-disable no-console */
    console.log("Started " + TITLE + " version: " + pkg.version + " at: " + new Date() + " on port: " + port);
    /* eslint-enable no-console */
  });
}

function setupFhconfigReloadHandler(fhconfig) {
  if (process.env.FHDEV === 'true') {
    return;
  }
  process.on(fhconfig.RELOAD_CONFIG_SIGNAL, function() {
    fhconfig.reload(cluster.workers, function(err) {
      if (err) {
        /* eslint-disable no-console */
        console.error("Config not reloaded");
        console.error(err);
        console.error("Please fix and try again!!");
        /* eslint-enable no-console */
      }
      createAndSetLogger();
    });
  });
}

//Closing a mongoose connection if needed.
function closeMongooseConnection() {
  if (mongooseConnection) {
    mongooseConnection.close();
  }
}

function handleMongoConnectionEvents(conn) {
  if (conn) {
    conn.on('error', function(err) {
      logger.error('Mongo connection error: ' + err);
      throw err;
    });

    conn.on('disconnected', function() {
      logger.error('Mongo connection lost. Socket closed');
      throw new Error('Mongo close even emitted');
    });
  }
}

function setupUncaughtExceptionHandler(logger, worker) {
  // handle uncaught exceptions
  process.on('uncaughtException', function(err) {
    logger.error("FATAL: UncaughtException, please report: " + util.inspect(err));
    /* eslint-disable no-console */
    console.error(new Date().toString() + " FATAL: UncaughtException, please report: " + util.inspect(err));
    /* eslint-enable no-console */
    if (err !== undefined && err.stack !== undefined) {
      logger.error(util.inspect(err.stack));
      /* eslint-disable no-console */
      console.trace(err.stack);
      /* eslint-enable no-console */
    }
    if (worker && worker.process) {
      worker.process.exit(1);
    } else {
      process.exit(1);
    }
  });

  // If the Node process ends, close the Mongoose connection
  process.on('SIGINT', closeMongooseConnection).on('SIGTERM', closeMongooseConnection);
}
