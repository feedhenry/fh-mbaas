#!/usr/bin/env node
var TITLE = "fh-mbaas";
process.env.component = TITLE;
if (!process.env.conf_file) process.env.conf_file = process.argv[2];

var util = require('util');
var args = require('optimist').argv;
var fs = require('fs');
var path = require('path');
var async = require('async');
var cluster = require('cluster');
var server;
var express = require('express');
var cors = require('cors');


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
var config;

if (!path.existsSync(configFile)) {
  console.error("Config file does not exist: " + configFile);
  process.exit(0);
}

// validate config file
var configvalidate = require('./lib/util/configvalidation.js');
try {
  var buf = fs.readFileSync(configFile);
  config = JSON.parse(buf.toString());
  configvalidate.configvalidation(config);
} catch (e) {
  console.error("Problems reading config file: " + configFile);
  console.error(e);
  process.exit(-1);
}

// Note: location/order of these requires for istanbul code coverage is important.
var coverage;
if (config.fhmbaas.code_coverage_enabled === true) {
  console.log("Code coverage is enabled..");
  coverage = require('istanbul-middleware');
  coverage.hookLoader(__dirname);
}

// create bunyan logger
var bunyan = require('bunyan');
var ringBuffer = new bunyan.RingBuffer({ limit: 200 });
// log serializer for generic requests
function reqSerializer(req) {
  return {
    reqId: req.id,
    method: req.method,
    url: req.url,
    worker: cluster.worker.id
    //headers: req.headers
  };
}

var loggerOptions = config.fhmbaas.logger;

// Iterate through our streams and set accordingly
for (var i=0; i<loggerOptions.streams.length; i++) {
  var stream = loggerOptions.streams[i];
  if (stream.type === 'raw') {
    stream.stream = ringBuffer;
  }
  if (stream.type === 'stream') {
    stream.stream = eval(stream.stream); // jshint ignore:line
  }
}

loggerOptions.serializers = {
  req: reqSerializer
};

var logger = bunyan.createLogger(loggerOptions);

// set 'global' logger and config objects
require('./lib/util/logger.js').setLogger(logger);
require('./lib/util/logger.js').setRingBuffer(ringBuffer);
require('./lib/util/config.js').setConfig(config);


// Get our version number from package.json
var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), "utf8"));

// handle uncaught exceptions
process.on('uncaughtException', function (err) {
  logger.error("FATAL: UncaughtException, please report: " + util.inspect(err));
  console.error(new Date().toString() + " FATAL: UncaughtException, please report: " + util.inspect(err));
  if (err !== undefined && err.stack !== undefined) {
   logger.error(util.inspect(err.stack));
  }
  console.trace();
  cleanShutdown();  // exit on uncaught exception
});


// Array of Worker processes
var workers = [];

// clean shut down - note cb is optional here (used in testsuite)
var cleanShutdown = function(cb) {
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
var RELOAD_CONFIG_SIGNAL = 'SIGUSR1';
process.on(RELOAD_CONFIG_SIGNAL, reloadConfig);

// reload the config
function reloadConfig() {
  var masterWorker = cluster.isMaster ? 'Master' : 'Worker';
  logger.info({worker: masterWorker, file: configFile}, 'Reloading config file');
  try {
    var buf = fs.readFileSync(configFile.toString());
    config = JSON.parse(buf.toString());
    configvalidate.configvalidation(config);
    if (cluster.isMaster) {
      console.log("Master telling all workers to reload config");
      for (var i = 0; i < workers.length; i++) {
        var worker = workers[i];
        if (worker.kill) worker.kill(RELOAD_CONFIG_SIGNAL);
        else if (worker.process && worker.process.kill) worker.process.kill(RELOAD_CONFIG_SIGNAL);
      }
    }else {
      require('./lib/util/config.js').setConfig(config);
      console.log("Worker loaded new config ok..");
    }
  } catch (e) {
    console.error("Config not reloaded, problems validating file: " + configFile);
    console.error(e);
    console.error("Please fix and try again!!");
  }
}

// start worker
function startWorker() {
  var app = express();

  // Enable CORS for all requests
  app.use(cors());

  var mbaas = require('./lib/mbaas.js')();
  mbaas.init(function(err) {
    if (err) {
      console.error("FATAL: " + util.inspect(err));
      console.trace();
      return cleanShutdown();  // exit on uncaught exception
    }

    app.use('/sys', require('./lib/sys.js')());
    app.use('/admin', require('./lib/admin-route.js')(mbaas));

    var port = config.fhmbaas.port;
    var server = app.listen(port, function() {
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
    cluster.on('exit', function (worker, code, signal) {
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

if (args.d === true){
  console.log("STARING ONE WORKER FOR DEBUG PURPOSES");
  startWorker();
}else {
  // Note: if required as a module, its up to the user to call start();
  if(require.main === module) {
    start();
  }
}
