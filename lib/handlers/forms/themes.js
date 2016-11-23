var express = require('express');
var fhForms = require('fh-forms');
var themesMiddleware = fhForms.middleware.themes;

var router = express.Router({
  mergeParams: true
});

//Deploying a theme to the mbaas.
router.post("/:id/deploy", themesMiddleware.deploy);

//Deploying a theme to the mbaas.
router.post("/", themesMiddleware.create);

//Updating A Theme That Already Exists.
router.put("/:id", themesMiddleware.update);

//Deleting A Theme From The Mbaas.
router.delete("/:id", themesMiddleware.remove);

//Importing Themes From The Core Platform.
router.post("/import", themesMiddleware.importThemes);

module.exports = router;

