var express = require('express');
var logger = require('fh-config').getLogger();
var storage = require("..");

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
router.get('/:resourceId', function(req, res) {
  var fileReference = req.params.resourceId;
  var tokenId = req.query.token;
  storage.getFileIfValid(fileReference, tokenId, function(err, found) {
    if (err) {
      return res.status(err.code || 500)
        .send("Cannot download file. Reason:" + err);
    }
    if (!found) {
      return res.status(404)
        .send("Invalid or outdated resource URL. Please generate new URL.");
    }
    var options = {
      root: found.directory,
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),

        // Never open content in browser, force download
        "Content-Type": "application/octet-stream",

        // hint for browser.
        "Content-Disposition": "attachment; filename=" + found.fileName
      }
    };
    res.sendFile(found.fileName, options, function(err) {
      if (err) {
        logger.error("Problem when sending file to client", {err: err});
        return res.status(err.status).end();
      }
      logger.info('Sent:', found.fileName);
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
router.get('/host/:resourceId', function(req, res) {
  var fileReference = req.params.resourceId;
  storage.getFileDetails(fileReference, function(err, found) {
    var response = {};
    if (err) {
      logger.error("Cannot get data", {err: err});
      res.status(404);
      response.message = err;
    } else {
      response.host = found.host;
    }
    res.json(response);
  });
});

module.exports = router;
