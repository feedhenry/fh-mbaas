var mongoose = require('mongoose');
var token = module.exports;

/**
 * Generate token
 *
 * @param  {Number} expiresIn expiration time in seconds
 * @return {Object}           Token
 */
token.generate = function(expiresIn) {
  if (!expiresIn || expiresIn < 0) {
    expiresIn = -1;
  }
  var currentTime = new Date().getTime();
  var timeToLive = currentTime + (expiresIn * 1000);
  return {
    "_id": mongoose.Types.ObjectId(),
    timeToLive: timeToLive
  };
};

/**
 * Check if token is still valid
 *
 * @param {TokenSchema} token Token instance to check for validity
 * @returns {boolean} true if token expired
 */
token.isExpired = function(token) {
  var currentTime = Date.now();
  return currentTime > token.timeToLive;
};