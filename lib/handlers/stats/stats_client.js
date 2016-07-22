var logger = require('../../util/logger').getLogger();
var request = require('request');
var fhconfig = require('fh-config');
var statsConfig = fhconfig.getConfig().rawConfig.fhstats;

function callStats(body, cb) {
  var statsHost = statsConfig.protocol + "://" + statsConfig.host + ":" + statsConfig.port;
  var url = statsHost + '/stats/history';

  var params = {
    counter: body.counter,
    f: body.f
  };

  logger.debug('Proxying to statsd', url, params);

  request.post({
    url: url,
    body: params,
    headers: {
      'x-feedhenry-statsapikey': statsConfig.apikey
    },
    json: true
  }, function(err, statsRes, statsBody) {
    logger.trace('Proxied to statsd', err, statsRes, statsBody);

    if (err) {
      return cb(err);
    }

    if (statsRes.statusCode !== 200) {
      return cb(new Error('Failed to call stats: ' + statsRes.statusCode));
    }

    return cb(null, statsBody);
  });
}

module.exports = callStats;