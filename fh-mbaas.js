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


// Show 'starting' message
var workerId = process.env.NODE_WORKER_ID || 0;
var starting = "Starting " + TITLE;
if (workerId !== 0) starting += " Worker: " + workerId;
console.log(starting);

// read our config file
var configFile = process.env.conf_file || args._[0];
var configvalidate = require('./lib/util/configvalidation');

fhconfig.init(configFile, configvalidate.configvalidation, function(err){
  if(err){
    console.error("Problems reading config file: " + configFile);
    console.error(err);
    process.exit(-1);
  }

  var coverage;
  // Note: location/order of these requires for istanbul code coverage is important.
  if(fhconfig.bool('fhmbaas.code_coverage_enabled')){
    coverage = require('istanbul-middleware');
    coverage.hookLoader(__dirname);
  }

  var logger = fhconfig.getLogger();

  //Setting Logger For The Forms Middleware Functions
  forms.core.setLogger(logger);

  // Get our version number from package.json
  var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), "utf8"));

  // handle uncaught exceptions
  process.on('uncaughtException', function(err) {
    logger.error("FATAL: UncaughtException, please report: " + util.inspect(err));
    console.error(new Date().toString() + " FATAL: UncaughtException, please report: " + util.inspect(err));
    if (err !== undefined && err.stack !== undefined) {
      logger.error(util.inspect(err.stack));
    }
    console.trace();
    cleanShutdown(); // exit on uncaught exception
  });

  // Array of Worker processes
  var workers = [];

  // clean shut down - note cb is optional here (used in testsuite)
  var cleanShutdown = function() {
    logger.info("Shutting down server..");
    if (cluster.isMaster) {
      // shutdown all our workers
      // we exit when all workers have exited..
      for (var i = 0; i < workers.length; i++) {
        var worker = workers[i];
        if (worker.destroy) worker.destroy();
        else if (worker.kill) worker.kill();
        else if (worker.process && worker.process.kill) worker.process.kill();
      }
    }

    process.exit(1);
  };

  module.exports.cleanShutdown = cleanShutdown;
  module.exports.start = start;
  module.exports.startWorker = startWorker;

  // handle process signals
  process.on('SIGTERM', cleanShutdown);
  process.on('SIGHUP', cleanShutdown);
  process.on('INT', cleanShutdown);

  process.on(fhconfig.RELOAD_CONFIG_SIGNAL, function(){
    fhconfig.reload(workers, function(err){
      if(err){
        console.error("Config not reloaded");
        console.error(err);
        console.error("Please fix and try again!!");
      }
    });
  });


  // start worker
  function startWorker() {
    var app = express();

    // Enable CORS for all requests
    app.use(cors());

    // Parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({
      extended: false
    }));

    // Parse JSON payloads
    app.use(bodyParser.json());

    //Multipart Form Request Parser
    app.use(multer({
      dest: fhconfig.value("fhmbaas.temp_forms_files_dest")
    }));

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
      }
    };

    logger.debug('JSON Config ', jsonConfig);

    fhmbaasMiddleware.init(jsonConfig);
    var models = fhmbaasMiddleware.models;
   
    models.init(jsonConfig , function (err) {
      if (err) { 
        console.error("FATAL: " + util.inspect(err));
        console.trace();
        return cleanShutdown(); // exit on uncaught exception
      }

      app.use('/sys', require('./lib/routes/sys.js')());
      app.use('/api/mbaas', require('./lib/routes/api.js'));

      app.use('/api/app', require('./lib/routes/app.js'));


      var port = fhconfig.int('fhmbaas.port');
      app.listen(port, function () {
        console.log("Started " + TITLE + " version: " + pkg.version + " at: " + new Date() + " on port: " + port);
      });
    });
  }

  // start: note we use one master and one worker, so any uncaught exceptions in worker
  // will result in the worker process being restarted by the master.
  function start() {
    if (cluster.isMaster) {
      var numCPUs = require('os').cpus().length;
      // Fork workers.
      for (var i = 0; i < numCPUs; i++) {
        var worker = cluster.fork();
        workers.push(worker);
      }

      // Handle workers exiting
      cluster.on('exit', function(worker) {
        if (worker.suicide === true) {
          console.log("Cleanly exiting..");
          process.exit(0);
        } else {
          var msg = "Worker: " + worker.process.pid + " has died!! Respawning..";
          logger.error(msg);
          console.error(msg);
          var newWorker = cluster.fork();
          for (var i = 0; i < workers.length; i++) {
            if (workers[i] && workers[i].id === worker.id) workers.splice(i);
          }
          workers.push(newWorker);
        }
      });
    } else {
      startWorker();
    }
  }

  if (args.d === true) {
    console.log("STARING ONE WORKER FOR DEBUG PURPOSES");
    startWorker();
  } else {
    // Note: if required as a module, its up to the user to call start();
    if (require.main === module) {
      start();
    }
  }
});

