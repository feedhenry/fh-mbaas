// TEST file that registers sample file to platform and exposes url.
// TO be removed after some client would be put in place !!

var storage = require("./storage");
var logger = require('fh-config').getLogger();

var filePath = "/opt/feedhenry/fh-mbaas/current/README.md"; // :)
module.exports = function(){
  console.log("STARTING DOWNLOAD TESTS");
  storage.registerFile(filePath, function(err, fileId){
    console.log("REGISTERED FILE", {err: err, fileId: fileId});
    if(fileId){
      storage.generateURL(fileId, null, function(err, data){
        console.log("GENERATED URL FOR FILE", {err: err, data: data});
      });
    }
  });
};
