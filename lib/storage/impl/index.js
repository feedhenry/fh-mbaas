var fs = require("fs");
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var os = require("os");
var FileModel = require("../models/FileSchema").Model;
var URL = require('url');

var path = require('path');
// path.isAbsolute polyfill
if (!path.isAbsolute) {
  path.isAbsolute = function(path) {
    return path.charAt(0) === '/';
  };
}

// Implementation for ../storage.js interface
var root = module.exports;

// Step 1 Register file to be exposed
root.registerFile = function(fileLocation, callback) {
  readFileSize(fileLocation, function(err, fileSize) {
    if (err) {
      return callback(err);
    }
    var data = {
      directory: path.dirname(fileLocation),
      fileName: path.basename(fileLocation),
      host: os.hostname(),
      size: fileSize
    };
    var model = new FileModel(data);
    model.save(function(err, newModel) {
      if (err) {
        logger.error("File model save failed", {err: err, data: data});
        return callback(err);
      }
      return callback(null, newModel);
    });
  });
};

/**
 * Generate full download URL for external access
 * @param  {ObjectId}   fileId File id
 * @param  {Date}   expiresIn     Token duration in seconds
 * @param  {Function} callback      Node-style callback
 */
root.generateURL = function(fileId, expiresIn, callback) {
  if (expiresIn <= 0) {
    expiresIn = fhconfig.value('storage.token_exp_time');
  }
  FileModel.findById(fileId, function(err, found) {
    if (err) {
      logger.warn("Cannot obtain file model " + fileId);
      return callback(new Error("Invalid file file id"));
    }
    if (!found) {
      return callback(new Error("Cannot download file. Invalid file file id"));
    }
    found.generateToken(expiresIn, function(err, token) {
      if (err) {
        logger.error("File model update failed", {err: err, fileId: fileId});
        return callback(new Error("Cannot save file model"));
      }
      callback(null, buildURLObj(fileId, token._id));
    });
  });
};

/**
 * Get details for registered file.
 */
root.getFileDetails = function(fildId, callback) {
  FileModel.findById(fildId, function(err, found) {
    if (err || !found) {
      logger.warn("Cannot obtain file model " + fildId);
      if (err) {
        logger.error(err);
      }
      return callback(new Error("Invalid file id"));
    }
    callback(null, found);
  });
};

/**
 * Helper to retrieve file model only when token is valid (not expired)
 *
 * @param fileId
 * @param token
 * @param callback
 */
root.getFileIfValid = function(fileId, token, callback) {
  FileModel.findById(fileId, function(err, found) {
    var error;
    if (err || !found) {
      logger.warn("Cannot obtain file model " + fileId);

      error = new Error("Invalid file id");
      error.code = 404;
      return callback(error);
    }

    if (!found.hasValidToken(token)) {
      error = new Error("Invalid token");
      error.code = 401;
      return callback(error);
    }
    var fullPath = path.resolve(found.directory, found.fileName);
    readFileSize(fullPath, function(err, size) {
      if (err) {
        err.code = 500;
        return callback(err);
      }

      if(!size) {
        error = new Error("File no longer exists");
        error.code = 404;
        return callback(error);
      }
      return callback(null, found);
    });
  });
};

/**
 * Read file and return it size
 * If provided location is invalid first argument would contain error.
 *
 * @param fileLocation
 * @param callback
 */
function readFileSize(fileLocation, callback) {
  // Avoid relative paths also for security issues
  if (!path.isAbsolute(fileLocation)) {
    callback(new Error('Path must be an absolute path!'));
  }

  fs.stat(fileLocation, function(err, stats) {
    if (err) {
      return callback(err);
    }
    if (stats.isFile()) {
      callback(null, stats.size);
    } else {
      callback(new Error(fileLocation + " is not a file"));
    }
  });
}
/**
 * Build URL object for dowloading file.
 */
function buildURLObj(fileId, token) {
  var urlObj = {
    protocol: fhconfig.value('storage.base_url_protocol'),
    host: fhconfig.value('storage.base_url_host'),
    pathname: "/api/storage/" + fileId,
    query:{token: token}
  };

  return {
    url: URL.format(urlObj)
  };
}
