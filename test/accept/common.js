var request = require('request');
var url = exports.baseUrl = process.env['url'] || "http://127.0.0.1:18819/";

function post(endPoint, data, cb) {
  request.post({url: url + endPoint, json: data}, function(err, response, data) {
    if (err) return cb(err + ' - ' + data);
    if (response.statusCode !== 200) return cb(response.statusCode + ' - ' + data);
    return cb(null, data);
  });
}

function put(endPoint, data, cb) {
  request.put({url: url + endPoint, json: data}, function(err, response, data) {
    if (err) return cb(err + ' - ' + data);
    if (response.statusCode !== 200) return cb(response.statusCode + ' - ' + data);
    return cb(null, data);
  });
}

function get(endPoint, cb) {
  request.get(url + endPoint, function(err, response, data) {
    if (err) return cb(err + ' - ' + data);
    if (response.statusCode !== 200) return cb(response.statusCode + ' - ' + data);

    var ret;
    try {
      ret = JSON.parse(data);
    } catch(x) {
      ret = data;
    }

    return cb(null, ret);
  });
}

function del(endPoint, cb) {
  request.del(url + endPoint, function(err, response, data) {
    if (err) return cb(err + ' - ' + data);
    if (response.statusCode !== 200) return cb(response.statusCode + ' - ' + data);
    return cb(null, data);
  });
}

exports.post = post;
exports.put = put;
exports.get = get;
exports.del = del;