var express = require('express');

var fhForms = require('fh-forms');
var formsMiddleware = fhForms.middleware.forms;

var router = express.Router();

//List All Forms
router.get('/', formsMiddleware.list);

//Get A Single Form
router.get('/:id', formsMiddleware.get);

router.post('/:id/deploy', formsMiddleware.deploy);

//Delete A Single Form
router['delete']('/:id', formsMiddleware.remove);

//Get Subscribers For A Form
//TODO: To Be Removed In Favor Of A Single Form Update. This makes the live edit/deploy much simpler.
router.get('/:id/notifications', formsMiddleware.listSubscribers);

//Update Subscribers For A Form
//TODO: To Be Removed In Favor Of A Single Form Update. This makes the live edit/deploy much simpler.
router.post('/:id/notifications', formsMiddleware.updateSubscribers);

//Submissions Related To This Form.
router.get('/:id/submissions', formsMiddleware.submissions);


module.exports = router;