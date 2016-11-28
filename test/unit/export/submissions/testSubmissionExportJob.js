const fixtures = require('../../../fixtures');
const assert = require('assert');
const fhConfig = require('fh-config');
fhConfig.setRawConfig(fixtures.config);

describe("Submission Export Job", function() {

  it("all required depedencies should be resolved", function(done) {
    try {
      require('../../../../lib/jobs/submissions/submissionExportJob.js');
      assert.ok(true, "All dependencies should have been resolved");
    } catch(err) {
      assert.ifError(err);
    } finally {
      done();
    }
  });

});


