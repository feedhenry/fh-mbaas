var express = require('express');

var router = express.Router({
  mergeParams: true
});

var fhmbaasMiddleware = require('fh-mbaas-middleware');

router.use('/:domain/:environment/:projectid/:appid/appforms', require('./app/forms.js'));
router.post("/:domain/:environment/:projectid/:guid/events", fhmbaasMiddleware.events.create,end);

function end(req,res){
  return res.json(req.resultData);
}

module.exports = router;
