"use strict";

var format = require('../../../lib/export/appDataExport').formatCollectionName;
var assert = require('assert');

module.exports.test_no_underscores = function (done) {
  var collectionName = "fh_testing-ezcuviwmulsalshv6nnj27vk-dev_colname";
  assert.equal(format(collectionName), "colname");
  done();
};

module.exports.test_underscores = function (done) {
  var collectionName = "fh_testing-ezcuviwmulsalshv6nnj27vk-dev_col_name";
  assert.equal(format(collectionName), "col_name");
  done();
};

module.exports.test_improper = function (done) {
  var collectionName = "improper-collection_name";
  assert.equal(format(collectionName), "improper-collection_name");
  done();
};
