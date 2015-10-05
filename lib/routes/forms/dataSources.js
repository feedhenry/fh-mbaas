var express = require('express');
var fhForms = require('fh-forms');

var router = express.Router({
  mergeParams: true
});

var dataSourcesMiddleware = fhForms.middleware.dataSources;


router.get('/', dataSourcesMiddleware.list);

//Deploying A Data Source To An Environment
router.post('/:id/deploy', dataSourcesMiddleware.deploy);

router.get('/:id', dataSourcesMiddleware.get);

//TODO: fh-mbaas needs to be able to call the service url to get a data set.
router.post('/validate', dataSourcesMiddleware.validate);

router.delete('/:id', dataSourcesMiddleware.remove);

module.exports = router;