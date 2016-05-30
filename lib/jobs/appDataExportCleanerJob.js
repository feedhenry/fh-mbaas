var fhconfig = require('fh-config');

var TaggedLogger = require('./taggedLogger').TaggedLogger;

const LOG_TAG = '[APPDATAEXPORT CLEANER]';

var logger = new TaggedLogger(fhconfig.getLogger(), LOG_TAG);

var Cleaner = require('../export/cleaner/appDataExportCleanerRunner').AppDataExportCleanerRunner;

const FINISH_EVENT = require('./progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('./progressPublisher').FAIL_EVENT;
const ProgressPublisher = require('./progressPublisher').ProgressPublisher;

const JOB_NAME = 'appExportCleaner';

function cleanerJob(agenda) {
  logger.info('Defining agenda job', JOB_NAME);

  agenda.define(JOB_NAME, function(job, done) {
    logger.info('Start running job', {jobName: JOB_NAME});

    var context = {
      logger: logger
    };

    var cleaner = new Cleaner(context);
    cleaner.on(FINISH_EVENT, function() {
      logger.info('Job execution finished');
      done();
    });
    cleaner.on(FAIL_EVENT, function(message) {
      logger.info('Job execution failed', message);
      done(message);
    });

    var publisherFunction = function(message) {
      logger.info('EVENT', message);
    };

    // We do not want to make 'batch' update, so we persist each received message: queue size = 1
    var progressPublisher = new ProgressPublisher(1, publisherFunction);
    progressPublisher.listen(cleaner);

    cleaner.run();
  });
}

module.exports.JOB_NAME = JOB_NAME;
module.exports.cleanerJob = cleanerJob;
