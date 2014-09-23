var Schema = require('mongoose').Schema;
var timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
var filter = require('mongoose-filter-denormalize').filter;
var validate = require('mongoose-validator');

var EnvironmentSchema = new Schema({
  _id: {
    type: String,
    required: true,
    unique: true,
    validate: [
      validate({
        validator: 'isLength',
        arguments: [1, 50],
        message: 'Name should be between 1 and 50 characters'
      }),
      validate({
        validator: 'matches',
        arguments: /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/i,
        message: 'Name should composed only of alphanumeric characters and dashes. Names may not start with a dash.'
      })
    ]
  },
  label: {
    type: String,
    required: true
  },
  mbaas_targets: [{
    type: String,
    ref: 'Mbaas'
  }]
});

EnvironmentSchema.statics.findByAvailable = function(available, cb) {
  this.find({
    '_id': {
      $in: available
    }
  }, this.getReadFilterKeys('public')).populate('mbaas_targets')
    .exec(function(err, environments) {
      return cb(err, environments);
    });
}

EnvironmentSchema.statics.all = function(cb) {
  console.log('findAll');

  this.find()
    .populate('mbaas_targets')
    .exec(function(err, environments) {
      return cb(err, environments);
    });
}

// Plugins
EnvironmentSchema.plugin(timestamps, {
  createdAt: 'created',
  updatedAt: 'modified'
});
EnvironmentSchema.plugin(filter, {
  readFilter: {
    "public": ['label']
  }
});

module.exports = EnvironmentSchema;