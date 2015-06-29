var express = require('express');

var router = express.Router({
  mergeParams: true
});

router.use('/:domain/:environment/:projectid/:appid/appforms', require('./app/forms.js'));

module.exports = router;
