var request = require("request");
var util = require('util');
var assert = require('assert');
var common = require('./common.js');

////////////// Teams - All this needs proper accept test when fully implemented!!
exports.it_should_create_team = function(finish){
  request({url: common.baseUrl + 'admin/teams', method: 'POST', json:{}}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

exports.it_should_update_team = function(finish){
  request({url: common.baseUrl + 'admin/teams', method: 'PUT', json:{}}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

exports.it_should_list_teams = function(finish){
  request(common.baseUrl + 'admin/teams', function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

exports.it_should_get_team = function(finish){
  request(common.baseUrl + 'admin/teams/1', function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

exports.it_should_delete_team = function(finish){
  request({url: common.baseUrl + 'admin/teams/1', method: 'DELETE'}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

////////////// Users
exports.it_should_add_user_to_team = function(finish){
  request({url: common.baseUrl + 'admin/teams/1/adduser', method: 'POST', json:{}}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

exports.it_should_remove_user_from_team = function(finish){
  request({url: common.baseUrl + 'admin/teams/1/removeuser/1', method: 'POST', json:{}}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

exports.it_should_remove_user_from_all_teams = function(finish){
  request({url: common.baseUrl + 'admin/users/1', method: 'DELETE'}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

//////////////// Business Objects
exports.it_should_set_business_objects = function(finish){
  request({url: common.baseUrl + 'admin/businessobjects', method: 'PUT', json: {}}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};

exports.it_should_get_business_objects = function(finish){
  request({url: common.baseUrl + 'admin/businessobjects', method: 'GET'}, function(err, response, body){
    //assert.ok(!err, 'Unexpected error: ', util.inspect(err));
    //assert.equal(response.statusCode, 200, 'Unexpected statusCode: ' + response.statusCode + ' - ' + util.inspect(body));
console.log("TODO - need proper check here ", body);
    finish();
  });
};
