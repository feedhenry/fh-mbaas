var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;
var timestamps = require('mongoose-timestamp');
var tokenUtil = require('../service/token');
var _ = require('underscore');

// use token._id as token value
var TokenSchema = new Schema({
  timeToLive: Date
});

TokenSchema.methods.isExpired = function() {
  return tokenUtil.isExpired(this);
};

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

FileSchema.index({location: 1}, {unique: false});

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
  this.fakeSave(function(err) {
    if (err) {
      logger.error("File model update failed", {err: err, fileReference: this._id});
      return cb(err);
    }
    cb(null, newToken);
  });
};

var fileRefs = {};
FileSchema.methods.fakeSave = function(cb) {
  if (!this._id) {
    this._id = mongoose.Types.ObjectId();
  }
  _.extend(this, FileSchema.methods);
  fileRefs[this._id] = this;
  cb(null, this);
};

FileSchema.methods.hasValidToken = function(id) {
  var token = _.find(this.tokens, function(t) {
    return t._id = id;
  });
  // token found and not expired
  return !!token && !tokenUtil.isExpired(token);
};

FileSchema.statics.fakeFindById = function(id, cb) {
  cb(null, fileRefs[id]);
};

exports.FileResource = mongoose.model('FileResource', FileSchema);
exports.FileResourceSchema = FileSchema;
exports.TokenSchema = TokenSchema;
