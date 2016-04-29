var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;
var timestamps = require('mongoose-timestamp');
var validate = require('mongoose-validator');
var _ = require('underscore');

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
    required: true,
  },
  // Token used to access data
  token: {
    type: String,
    required: false,
  },
  // Timestamp for token validation
  tokenValid: {
    type: Number,
    required: false,
  },
  // File size
  size: {
    type: Number,
    required: false
  }
});

FileSchema.index({location: 1}, {unique: false});

// Plugins
FileSchema.plugin(timestamps, {
  createdAt: 'created',
  updatedAt: 'modified'
});

module.exports.FileResource = mongoose.model('FileResource', FileSchema);
module.exports.FileResourceSchema = FileSchema;
