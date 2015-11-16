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
var async = require('async');

var fhCluster = require('fh-cluster');

var formsUpdater = require('./lib/formsUpdater');

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

  var cleanShutdown = function(clusterWorker) {
    logger.info("Shutting down server..", clusterWorker.id, clusterWorker.process.pid);

    process.exit(1);
  };


  // start worker
  function startWorker(clusterWorker) {
    var app = express();
    var scheduler;

    // clean shut down - note cb is optional here (used in testsuite)
    // Handle workers exiting
    clusterWorker.on('exit', function() {
      logger.info("Cleanly exiting..", this.id);
      cleanShutdown(clusterWorker);
    });

    clusterWorker.on('disconnect', function() {
      var self = this;
      logger.info("Worker Disconnected..", self.id);
      // Worker has disconnected
      if(scheduler){
        logger.info("Shutting down scheduler..", self.id, self.process.pid);
        scheduler.tearDown(function(){
          logger.info("Scheduler Shut Down..", self.id, self.process.pid);
        });
      }
    });

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

    var conf = fhconfig.getConfig();

    logger.info("Initialising scheduler ", clusterWorker.id, clusterWorker.process.pid);
    scheduler = formsUpdater.scheduler(logger, conf.rawConfig, fhconfig.mongoConnectionString());
    logger.info("Initialised scheduler", scheduler);

    async.parallel([
      function initFhMbaasMiddleware(cb){
        var mbaasMiddlewareConfig = {
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
          logger: logger
        };

        fhmbaasMiddleware.init(mbaasMiddlewareConfig, cb);
      },
      function initFhServicAuth(cb){
        fhServiceAuth.init({
          logger: logger
        }, cb);
      }
    ], function(err){
      if(err){
        console.error("FATAL: " + util.inspect(err));
        console.trace();
        return cleanShutdown(clusterWorker); // exit on uncaught exception
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

  if (args.d === true) {
    console.log("STARING ONE WORKER FOR DEBUG PURPOSES");
    startWorker();
  } else {
    fhCluster(startWorker);
  }
});

