var proxyquire = require('proxyquire');
var assert = require('assert');

var DOMAIN = "test";
var ENVIRONMENT = "test";
var APPNAME = "testappname";
var mockdfc = function(){
  return {
    dynos : function(args, cb){
      console.log('get dyno for ' + args[0]);
      if(args[0] === DOMAIN){
        return cb();
      } else {
        return cb(new Error('not found'));
      }
    },

    'stop-app': function(args, cb){
      assert.equal(args[0], DOMAIN, 'domain does not match');
      assert.equal(args[1], APPNAME, 'appname does not match');
      return cb();
    }
  }
}

var dfutils = proxyquire('../../../lib/util/dfutils', {'fh-dfc': mockdfc});

exports.it_should_stop_app = function(finish){
  dfutils.stopApp(DOMAIN, ENVIRONMENT, APPNAME, function(err){
    assert.ok(!err, 'failed to stop app');
    dfutils.clearInterval(); //need to call this otherwise the test runner will not finish
    finish();
  });
}