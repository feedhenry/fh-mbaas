var logger = require('lib/util/logger.js');
var util = require('util');
var assert = require('assert');

exports.it_should_test_logger = function(finish) {
  var l = logger.getLogger();
  logger.setLogger(l);

  var rb = logger.getRingBuffer();
  logger.setRingBuffer(rb);
  finish();
}
