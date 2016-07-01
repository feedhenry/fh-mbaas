// TEST file that registers sample file to platform and exposes url.
// TO be removed after some client would be put in place !!

var storage = require("./storage");
var logger = require('../util/logger').getLogger();
var path = require('path');

// Use project readme as test file
var filePath = path.resolve(__dirname, "../../README.md");
module.exports = function() {
  logger.trace("STARTING DOWNLOAD TESTS");
  storage.registerFile(filePath, function(err, fileId) {
    logger.trace("REGISTERED FILE", {err: err, fileId: fileId});
    if (fileId) {
      storage.generateURL(fileId, null, function(err, data) {
        logger.trace("GENERATED URL FOR FILE", {err: err, data: data});
      });
    }
  });
};
