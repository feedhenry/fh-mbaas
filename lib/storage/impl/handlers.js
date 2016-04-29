var express = require('express');
var fhconfig = require('fh-config');
var path = require('path');
var logger = require('fh-config').getLogger();
var fs = require('fs');
var FileModel = require("../model/resource").FileResource;
var storageImpl = require("./storage_impl");

var router = express.Router({
  mergeParams: true
});

/**
 * Download route.
 * 
 * Provides binary content for specified parameters.
 *
 * @param resourceId - id of resource to be dowloaded
 * @queryParam token - token that will be used to download file
 *
 * @return binaryFile (application/octet-stream)
 */
router.get('/:resourceId', function(req, res){
  var fileReference = req.params.resourceId;
  var token = req.query.token;
  storageImpl.getFileIfValid(fileReference, token, function(err, found){
    if(err){
      res.status(404);
      return res.send("Cannot download file. Reason:" + err);
    }
    if(!found){
      res.status(404);
      return res.send("Invalid or outdated resource URL. Please generate new URL.");
    }
    var options = {
      root: found.directory,
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        "Content-Type": "application/octet-stream", // Never open content in browser, force download
        "Content-Disposition": "attachment; filename=" + found.fileName // hint for browser.
      }
    };
    res.sendFile(found.fileName, options, function(err){
      if(err){
        logger.error("Problem when sending file to client", {err: err});
        res.status(err.status).end();
      }else{
        logger.info('Sent:', found.fileName);
      }
    });
  });
});

/**
 * Host route.
 *
 * Fetch mbaas host (mbaas url) to determine where resource was stored
 * Internal endpoint used by proxy to determine which mbaas should be called to get file
 * (Ugly hack done because of platform limitations)
 */
router.get('host/:resourceId', function(req, res, next){
  var fileReference = req.params.resourceId;
  storageImpl.getFileDetails(fileReference, function(err, found){
    var response = {};
    if(err){
      logger.error("Cannot get data", {err: err});
      res.status(404);
      response.message = err;
    }else{
      response.host = found.host;
    }
    res.json(response);
  });
});

module.exports = router;
