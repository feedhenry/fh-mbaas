module.exports = function(fhconfig){

  var servicekey = fhconfig.value('fhmbaas.key');

  return function(req, res, next){
    if(servicekey && servicekey.length > 0){
      var key = req.get('x-fh-service-key');
      if(key === servicekey){
        next();
      } else {
        res.status(401).end();
      }
    } else {
      next();
    }
  };
};