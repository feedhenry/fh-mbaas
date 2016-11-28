"use strict";

var proxyquire = require('proxyquire');
var assert = require('assert');
var sinon = require('sinon');
var fhConfig = require("fh-config");

fhConfig.setRawConfig({
  fhmbaas: {
    "appdata_jobs" : {
      "upload_dir" : "/var/feedhenry/upload"
    }
  }
});


var MOCK_FILE_ID = "575a76f0c2a6a0f341209b47";

var middleware = proxyquire('../../../../lib/middleware/appdata_import', {
  "../storage": {
    registerFileForUpload: function (filepath, filesize, callback) {
      assert.equal(filepath, "/var/feedhenry/upload/test");
      assert.equal(filesize, 1024);
      callback(null, {
        _id: MOCK_FILE_ID
      });
    }
  }
});

exports.test_register_upload = function(done) {
  var req = {
    params: {
      filename: "test",
      filesize: 1024
    }
  };

  middleware.registerUpload(req, null, function (err) {
    assert.equal(err, undefined);
    assert.equal(req.params.fileId, MOCK_FILE_ID);
    done();
  });
};

exports.test_invalid_filesize = function(done) {
  var req = {
    params: {
      filename: "test",
      filesize: null
    }
  };

  middleware.registerUpload(req, null, function (err) {
    // Expect an error here
    assert.ok(err);
    done();
  });
};

exports.test_invalid_filename = function(done) {
  var req = {
    params: {
      filename: null,
      filesize: 1024
    }
  };

  middleware.registerUpload(req, null, function (err) {
    // Expect an error here
    assert.ok(err);
    done();
  });
};
