var Schema = require('mongoose').Schema;
var timestamps = require('mongoose-timestamp');
var tokenUtil = require('../service/token');

var TokenSchema = new Schema({
  timeToLive: Date
});

TokenSchema.plugin(timestamps, {
  createdAt: 'created'
});

TokenSchema.methods.equals = function(otherToken) {
  return this._id === otherToken._id;
};

TokenSchema.methods.isExpired = function() {
  return tokenUtil.isExpired(this);
};

module.exports = TokenSchema;