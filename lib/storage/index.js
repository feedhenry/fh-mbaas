var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var os = require("os");
var FileModel = require("./models/FileSchema").Model;
var URL = require('url');
var common = require('../util/common');
var async = require('async');

var path = require('path');
// path.isAbsolute polyfill
if (!path.isAbsolute) {
  path.isAbsolute = function(path) {
    return path.charAt(0) === '/';
  };
}

/**
 * fh-storage module
 *
 * Expose files internal files to be downloaded by clients.
 */
var storage = module.exports;

/**
 * Register new file to be exposed externally with download url.
 *
 * @param fileLocation - file location in local filesystem
 * @param callback
 * @callbackreturns fileReference - reference to registered file that should be stored and passed to generateURL method
 *
 * @exception file does not exist or it's not accessible
 * @exception location provided is a folder. Folders aren't supported by current implementation
 */
storage.registerFile = function(fileLocation, callback) {
  common.readFileSize(fileLocation, function(err, fileSize) {
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
 * Register a new file for upload. In that case the file is  not physically present in the location
 * yet but we already create a database entry for it. We do that so we can create an upload URL and
 * provide token authentication.
 *
 * @param futureFileLocation The location the file will be stored
 * @param callback
 */
storage.registerFileForUpload = function(futureFileLocation, futureFileSize, callback) {
  var data = {
    directory: path.dirname(futureFileLocation),
    fileName: path.basename(futureFileLocation),
    host: os.hostname(),
    size: futureFileSize
  };
  var model = new FileModel(data);
  model.save(function(err, newModel) {
    if (err) {
      logger.error("File model save failed", {err: err, data: data});
      return callback(err);
    }
    return callback(null, newModel);
  });
};

storage.deleteFile = function(fileId, callback) {
  FileModel.findById(fileId, function(err, found) {
    if (err || !found) {
      logger.warn("Cannot obtain file model " + fileId);
      if (err) {
        logger.error(err);
      }
      return callback(new Error("Invalid file id"));
    }
    found.remove(callback);
  });
};


/**
 * Generate URL that will be used to upload or download the resource. For downloads use this URL with
 * `GET`. For uploads use `POST`.
 *
 * Link will be valid for specified amount of time (expiresIn)
 *
 * @param fileReference - String reference returned for registration method
 * @param expiresIn - number of seconds for URL to be valid. After that time new URL will be required. Can be null
 * @param callback
 * @callbackreturns url string - full URI to resource that would be
 *
 * @exception fileReference is invalid. File should be registered first to obtain reference id.
 * @exception file no longer exist or file contents changed
 *
 */
storage.generateURL = function(fileId, jobId, expiresIn, callback) {
  if (expiresIn <= 0) {
    expiresIn = fhconfig.value('storage.token_exp_time');
  }
  storage.getFileDetails(fileId, function(err, found) {
    if (err) {
      return callback(err);
    }
    found.generateToken(expiresIn, function(err, token) {
      if (err) {
        return callback(err);
      }
      callback(null, buildURLObj(fileId, token._id.toString(), jobId));
    });
  });
};

/**
 * Get file details
 *
 * @param fileReference - String reference returned for registration method
 * @callbackreturns file details including location and size
 *
 * @exception fileReference is invalid. File should be registered first to obtain reference id.
 */
function getFileDetails(fileId, callback) {
  FileModel.findById(fileId, function(err, found) {
    if (err || !found) {
      logger.warn("Cannot obtain file model " + fileId);
      if (err) {
        logger.error(err);
      }
      return callback(new Error("Invalid file id"));
    }
    callback(null, found);
  });
}
storage.getFileDetails = getFileDetails;

/**
 * Update the name of a file once it's upload has finished. The reason is that
 * the file upload middleware will use a random name to avoid clashes.
 *
 * @param fileId The file ID
 * @param newSize The total size of the file
 * @param callback
 */
storage.updateFileName = function(fileId, newName, callback) {
  FileModel.findById(fileId, function(err, found) {
    if (err || !found) {
      logger.warn("Cannot obtain file model " + fileId);
      if (err) {
        logger.error(err);
      }
      return callback(new Error("Invalid file id"));
    }

    found.fileName = newName;
    found.save(callback);
  });
};

storage.getFileIfValid = function(fileId, token, cb) {
  async.waterfall([
    async.apply(storage.checkToken, fileId, token),
    function (found, callback) {
      var fullPath = path.resolve(found.directory, found.fileName);
      common.readFileSize(fullPath, function(err, size) {
        if (err) {
          err.code = 500;
          return callback(err);
        }

        if (!size) {
          var error = new Error("File no longer exists");
          error.code = 404;
          return callback(error);
        }
        return callback(null, found);
      });

    }
  ], function (err, result) {
    if (err) {
      return cb(err);
    }

    cb(null, result);
  });
};

storage.checkToken = function(fileId, token, callback) {
  getFileDetails(fileId, function(err, found) {
    var error;
    if (err) {
      err.code = 404;
      return callback(err);
    }

    if (!found.hasValidToken(token)) {
      error = new Error("Invalid token");
      error.code = 401;
      return callback(error);
    }

    return callback(null, found);
  });
};

/**
 * Build URL object for dowloading file.
 */
function buildURLObj(fileId, token, jobId) {
  var urlObj = {
    protocol: fhconfig.value('storage.base_url_protocol'),
    host: fhconfig.value('storage.base_url_host'),

    // Download route does not require a jobId, but upload route does
    // Support both cases
    pathname: "/api/storage/" + (jobId ? (jobId + '/') : '') + fileId,
    query:{token: token}
  };

  var url = URL.format(urlObj);
  return {
    url: url
  };
}

/**
 * Router export from internal implementation
 * @type {express.Router}
 */
storage.router = require('./impl/router.js');