module.exports = function(cfg){
  var config = cfg;

  return function(req, res, next){
    if(config.fhmbaas.key && config.fhmbaas.key.length > 0){
      var key = req.get('x-fh-service-key');
      if(key === config.fhmbaas.key){
        next();
      } else {
        res.status(401).end();
      }
    } else {
      next();
    }
  };
};