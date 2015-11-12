var express = require('express');
var handlers = require('./handlers');

var router = express.Router({
  mergeParams: true
});

router.get('/', handlers.list);

//Deploying A Data Source To An Environment
router.post('/:id/deploy', handlers.deploy);

router.get('/:id', handlers.get);

router.post('/validate', handlers.validate);

router.delete('/:id', handlers.remove);

module.exports = router;