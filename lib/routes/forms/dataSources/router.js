var express = require('express');
var handlers = require('./handlers');

var router = express.Router({
  mergeParams: true
});

router.get('/', handlers.list);

//Deploying A Data Source To An Environment
router.post('/:id/deploy', handlers.deploy);
//Getting a single audit log entry.
router.get('/audit_logs/:logid', handlers.getAuditLogEntry);

//Listing Audit Logs
router.get('/:id/audit_logs', handlers.getAuditLog);

router.get('/:id', handlers.get);

router.post('/validate', handlers.validate);

//Forcing A Refresh Of A Specific Data Source
router.post('/:id/refresh', handlers.refresh);

router.delete('/:id', handlers.remove);

module.exports = router;
