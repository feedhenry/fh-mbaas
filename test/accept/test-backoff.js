var spawn = require('child_process').spawn;

var moduleBaseDir = process.cwd().split('test')[0];
var server;

exports.afterEach = function(finish) {
  if(server) {
    server.kill();
  }
  finish();
};

exports.it_should_start_with_mongo_running = function(finish) {
  //return finish();
  process.env['PATH'] = process.env['PATH'] + ':' + moduleBaseDir;
  server = spawn('fh-mbaas.js', [moduleBaseDir + '/config/dev.json', '-d']);

  server.stdout.on('data', function(data) {
    console.log(data.toString('utf8'));
    if (data.toString('utf8').indexOf('Started fh-mbaas') == 0) {
      console.log('Started fh-mbaas successfully');
      finish();
    }
  });

  server.stderr.on('data', function(data) {
    console.log(data.toString('utf8'));
    finish(new Error(data.toString('utf8')));
  });

};

exports.it_should_backoff_with_mongo_unavailable = function(finish) {
  //return finish();
  process.env['PATH'] = process.env['PATH'] + ':' + moduleBaseDir;
  server = spawn('fh-mbaas.js', [moduleBaseDir + '/test/accept/dummy-broken-conf.json', '-d']);

  server.stdout.on('data', function(data) {
    console.log(data.toString('utf8'));
    if (data.toString('utf8').indexOf('Will retry in') == 0) {
      finish();
    }
  });
  server.stderr.on('data', function(data) {
    console.log(data.toString('utf8'));
  });
};
