function addBooleanParam(ary, paramsMap, key, param, negate) {
  var val = paramsMap[key];

  if (val === undefined || val === null) {
    // value not present
    return;
  }

  val = negate ? !val : val;

  if (val) {
    ary.push(param);
  }
}

function addParam(ary, paramsMap, key, param) {
  var val = paramsMap[key];

  if (val) {
    ary.push(param, val);
  }
}

module.exports.addParam = addParam;
module.exports.addBooleanParam = addBooleanParam;