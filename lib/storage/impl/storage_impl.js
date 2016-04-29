var fs = require("fs");
var path = require('path');
var logger = require('fh-config').getLogger();
var os = require("os");
var _ = require("underscore");
var mongoose = require('mongoose');
var fhconfig = require('fh-config');
var FileModel = require("../model/resource").FileResource;
var tokenUtil = require("../service/token");

// Implementation for ../storage.js interface
var root = module.exports;

// Step 1 Register file to be exposed
root.registerFile = function(fileLocation, callback){
  readFile(fileLocation, function(err, fileSize){
    if(err){
      return callback(err);
    }
    var data = {
      directory: path.dirname(fileLocation),
      fileName: path.basename(fileLocation),
      host: os.hostname(),
      size: fileSize
    };
    logger.debug("Saving new file model", {data: data});
    var model = new FileModel(data);
    model.save(function(err, newModel){
      if(err){
        logger.error("File model save failed", {err: err, data: data});
        return callback(err);
      }
      return callback(null, newModel._id);
    });
  });
};

// Step 2. Generate full donwload URL for external access
root.generateURL = function(fileReference, expiresIn, callback){
  if(expiresIn <= 0){
    expiresIn = fhconfig.value('storage.token_exp_time');
  }
  FileModel.findById(fileReference, function(err, found){
    if(err){
      logger.warn("Cannot obtain file model " + fileReference);
      return callback("Invalid file reference");
    }
    if(!found){
      return callback("Cannot download file. Invalid file reference");
    }
    var newToken = tokenUtil.generate(expiresIn);
    logger.debug("Saving newToken", {fileReference: fileReference, newToken: newToken});
    found.set(newToken);
    found.save(function(err, model){
      if(err){
        logger.error("File model update failed", {err: err, fileReference: fileReference});
        return callback("Cannot save file model");
      }
      callback(null, buildURLObj(fileReference, newToken));
    });
  });
};

// Get details for registered file.
root.getFileDetails = function(fileReference, callback){
  FileModel.findById(fileReference, function(err, found){
    if(err || !found){
      logger.warn("Cannot obtain file model " + fileReference);
      return callback("Invalid reference");
    }
    callback(null, found);
  });
};

/**
 * Helper to retireve file model only when token is valid (not expired)
 *
 * @param fileReference
 * @param token
 * @param callback
 */
root.getFileIfValid = function(fileReference, token, callback){
  FileModel.findById(fileReference, function(err, found){
    if(err || !found){
      logger.warn("Cannot obtain file model " + fileReference);
      return callback("Invalid reference");
    }
    if(found.token !== token){
      return callback("Invalid token");
    }
    if(tokenUtil.isExpired(found.tokenValid)){
      return callback("Token expired");
    }
    var fullPath = path.resolve(found.directory, found.fileName);
    readFile(fullPath, function(err, size){
      if(err || !size){
        return callback("File no longer exist");
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
function readFile(fileLocation, callback){
  fs.stat(fileLocation, function(err, stats){
    if(err){
      return callback(err);
    }
    if(stats.isFile()){
      callback(null, stats.size);
    }else{
      callback("Location is not a file");
    }
  });
}
/**
 * Build URL object for dowloading file.
 */
function buildURLObj(fileReference, token){
  // Open question how to  get full url (fhcap, config, appModel)
  // Alternative here is to return only path and let supercore to join host but this would make this service less
  // generic etc. There are urls already stored in config and fhcap can put proper value in config - separate fhcap PR required.
  var baseUrl = fhconfig.value('storage.base_url');
  return {
    url: baseUrl + "/api/storage/" + fileReference + "?token=" + token
  };
  
}
