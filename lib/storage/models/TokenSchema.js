var Schema = require('mongoose').Schema;
var timestamps = require('mongoose-timestamp');

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
  return this.timeToLive.getTime() < new Date().getTime();
};

module.exports = TokenSchema;