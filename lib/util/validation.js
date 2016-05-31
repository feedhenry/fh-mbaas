var common = require('./common.js');

function requireParam(name, req, res) {

  var param = req.body[name];
  if (!param || param.length <=0) {
    common.handleError(new Error('Missing param ' + name), 'Missing param ' + name, 400, req, res);
    return null;
  }
  return param;
}

function validateParamPresent(name, req) {
  var param = req.body[name];

  return !(param && param.length > 0 );
}

module.exports = {
  requireParam: requireParam,
  validateParamPresent: validateParamPresent
};
