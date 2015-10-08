var express = require('express');
var fhForms = require('fh-forms');
var formsProjectsMiddleware = fhForms.middleware.formProjects;

var router = express.Router({mergeParams: true});

//Updating Forms To An Existing Project

router.post('/',  formsProjectsMiddleware.update, formsProjectsMiddleware.updateTheme);

router.put('/:id', formsProjectsMiddleware.update, formsProjectsMiddleware.updateTheme);

router.put('/:id/config', formsProjectsMiddleware.updateConfig);

router.delete('/:id', formsProjectsMiddleware.remove);

//Importing Form Project association Form The Core Platform
router.post('/import', formsProjectsMiddleware.importProjects);

router.post('/config/import', formsProjectsMiddleware.importProjectConfig);

module.exports = router;