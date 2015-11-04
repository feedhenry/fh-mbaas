/*
 JBoss, Home of Professional Open Source
 Copyright Red Hat, Inc., and individual contributors.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var request = require('request');
var util = require('util');
var _ = require('underscore');


module.exports = function messagingClient(config){
  
 const API_KEY_HEADER = "x-feedhenry-msgapikey";
 const CONF_API_KEY_KEY = "apikey";
 const CONF_HOST = "host";
 const CONF_PORT = "port";
 const CONF_PROTOCOL = "protocol";
 const MISSING_CONFIG_KEY_ERROR = "Missing required config key %s";
 const MISSING_CONFIG_ERROR = "Missing config. No config passed to metrics client";
 if(! config){
  throw new Error(MISSING_CONFIG_ERROR);
 }

 function checkConfigKeys(keys){
  _.each(keys, function(k){
   if(! config.hasOwnProperty(k)){
    throw new Error(util.format(MISSING_CONFIG_KEY_ERROR,k));
   }
  });
 }
 
 checkConfigKeys([CONF_API_KEY_KEY,CONF_HOST,CONF_PORT,CONF_PROTOCOL]);


 function log(message){
  if(config.debug){
   console.log("fh-metrics-client: ", message);
  }
 }

 function getUrl(path){
  return config[CONF_PROTOCOL] + "://" + config[CONF_HOST] + ":" + config[CONF_PORT] + path;
 }

  function appendCommonHeaders(toAdd){
    var headers = {};
    headers[API_KEY_HEADER] = config.apiKey;
    if(toAdd) {
      _.extend(headers, toAdd);
    }
    return headers;
  }

 function requestCallback(cb){
  return function (err,response,body){
   return cb(err,body,response.statusCode);
  }
 }
  
 /** this is just a representation of a common message schema
  * {
      guid:string (instance app id),
      appid:string (widget project id),
      domain:string,
      bytes:fullparams.bytes, //number
      cached:false,
      cuid:_fh.cuid || "",
      destination:_fh.destination || "",
      agent: fullparams.agent,
      'function':fullparams.funct || "",
      ipAddress:ip,
      scriptEngine:"node",
      'status':fullparams.status || "",
      time:fullparams.time || 0,
      startTime : fullparams.start,
      endTime : fullparams.end,
      'version':_fh.version || 0}
  */
 
 return{
  "createAppMessage": function (topic,message,cb){
   //send on to messaging
    var url = getUrl("/msg/" + topic);
    log("got url for messaging " + url);
    request({"url":url,"method":"POST","json":message,headers:appendCommonHeaders()},requestCallback(cb));
  }
 }
 
 
};
