var fs = require("fs");
var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var os = require("os");
var FileModel = require("./models/FileSchema").Model;
var URL = require('url');

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
 * Generate URL that will be used to download resource.
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
storage.generateURL = function(fileId, expiresIn, callback) {
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
      callback(null, buildURLObj(fileId, token._id.toString()));
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

storage.getFileIfValid = function(fileId, token, callback) {
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
    return callback(new Error('Path must be an absolute path!'));
  }

  fs.stat(fileLocation, function(err, stats) {
    if (err) {
      return callback(err);
    }
    if (!stats.isFile()) {
      return callback(new Error(fileLocation + " is not a file"));
    }
    return callback(null, stats.size);
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