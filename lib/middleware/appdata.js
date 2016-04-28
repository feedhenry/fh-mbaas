var fixtures = require('../../test/fixtures/appdata');
exports.findJob = function(req, res, next, jobId) {
  req.job = fixtures.exportJobs[jobId];
  if (!req.job) {
    var err = new Error();
    err.message = "Job not found";
    err.code = 404;
    return next(err);
  }
  next();
};