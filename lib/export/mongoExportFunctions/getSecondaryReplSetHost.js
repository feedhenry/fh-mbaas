const CONSTANTS = require('./constants');
const exec = require('child_process').exec;

/**
 * Return the host name of the secondary replica set (if possible). It is ok
 * to use `child_process#exec` here because the expected output is either an
 * error message or very small.
 *
 * The command that is run on mongo is using the `rs#status` method to get
 * replica set data. It will first check if the `members` property is present.
 * If not then this setup does not have replica sets.
 */
module.exports = function getSecondaryReplSetHost(cb) {
  var command = [
    'mongo --quiet --eval',
    ' "this.rs.status().members && this.rs.status().members.filter(function (x) { return x.state === 2 })[0].name"'
  ].join('');

  exec(command, function(err, stdout, stderr) {
    if (err) {
      return cb(err);
    }

    // If the mongo db does not have replica sets, an error will
    // be written to stderr
    if (stderr || !stdout) {
      return cb(null, null);
    }

    var result = {
      port: CONSTANTS.MONGO_DEFAULT_PORT
    };

    // URL can also contain the port. Can't use `url#parse` here because its
    // not a complete URL.
    if (stdout.indexOf(":") > 0) {
      var parts = stdout.split(":");
      result.host = parts[0].trim();
      result.port = parts[1].trim();
    } else {
      result.host = stdout.trim();
    }

    return cb(null, result);
  });
};
