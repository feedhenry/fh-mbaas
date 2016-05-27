var Schema = require('mongoose').Schema;
var timestamps = require('mongoose-timestamp');
var _ = require('underscore');
var TokenSchema = require('./TokenSchema');

var FileSchema = new Schema({
  // File directory
  directory: {
    type: String,
    required: true
  },
  // File name
  fileName: {
    type: String,
    required: true
  },
  // Mbaas hostname used to determine where data is stored
  host: {
    type: String,
    required: true
  },
  tokens: [TokenSchema],
  // File size
  size: {
    type: Number,
    required: false
  }
});

FileSchema.index({fileName: 1}, {unique: false});

FileSchema.plugin(timestamps, {
  createdAt: 'created',
  updatedAt: 'modified'
});

/**
 * Generates a new token
 * @param  {Function(TokenSchema)} cb node-style callback
 */
FileSchema.methods.generateToken = function(expiresIn, cb) {
  if (!expiresIn || expiresIn < 0) {
    expiresIn = -1;
  }
  var currentTime = new Date().getTime();
  var timeToLive = currentTime + (expiresIn * 1000);
  this.tokens.push({
    timeToLive: timeToLive
  });
  var self = this;

  this.save(function(err) {
    if (err) {
      return cb(err);
    }
    cb(null, self.tokens[self.tokens.length - 1]);
  });
};

FileSchema.methods.hasValidToken = function(id) {
  var token = _.find(this.tokens, function(t) {
    return t._id.toString() === id;
  });
  // token found and not expired
  return !!token && !token.isExpired();
};

exports.FileSchema = FileSchema;
exports.TokenSchema = TokenSchema;

exports.createModel = function(connection) {
  exports.Model = connection.model('File', FileSchema);
  return exports.Model;
};
