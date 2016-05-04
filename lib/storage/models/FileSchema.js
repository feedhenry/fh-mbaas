var Schema = require('mongoose').Schema;
var timestamps = require('mongoose-timestamp');
var tokenUtil = require('../service/token');
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
  var newToken = tokenUtil.generate(expiresIn);
  this.tokens.push(newToken);
  this.save(function(err) {
    if (err) {
      return cb(err);
    }
    cb(null, newToken);
  });
};

FileSchema.methods.hasValidToken = function(id) {
  var token = _.find(this.tokens, function(t) {
    return t._id = id;
  });
  // token found and not expired
  return !!token && !tokenUtil.isExpired(token);
};

exports.FileSchema = FileSchema;
exports.TokenSchema = TokenSchema;

exports.createModel = function(connection) {
  exports.Model = connection.model('File', FileSchema);
  return exports.Model;
};
