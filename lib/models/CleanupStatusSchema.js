"use strict";

const Schema = require('mongoose').Schema
  , timestamps = require('mongoose-timestamp');

const CleanupStatusSchema = new Schema({
  // Number of mbaas nodes
  nodes: {
    required: true,
    type: Number
  },
  // Nodes that already performed cleanup
  runList: {
    required: false,
    type: [String]
  }
});

CleanupStatusSchema.plugin(timestamps, {
  createdAt: 'created',
  updatedAt: 'modified'
});

exports.createModel = function (connection) {
  return connection.model('CleanupStatus', CleanupStatusSchema);
};