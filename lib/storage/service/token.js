var mongoose = require('mongoose');

//Token managment module
var token = module.exports;

/**
 * Generate token
 *
 * @param expiresIn - expiration time in seconds
 */
token.generate = function(expiresIn){
  var newToken = mongoose.Types.ObjectId();
  var currentTime = new Date().getTime();
  var validTime = currentTime + (expiresIn * 1000);
  return {token: newToken, tokenValid: validTime};
};

/**
 * Check if token is still valid
 * 
 * @param validTime
 * @returns {boolean} true if token expired
 */
token.isExpired = function(validTime){
  var currentTime = Date.now();
  return currentTime > validTime;
};