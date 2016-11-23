var fhconfig = require('fh-config');
var logger = require('../util/logger').getLogger();
var os = require('os');
var Agenda = require('fh-agenda');

var cleanerJob = require('../jobs/appDataExportCleanerJob').cleanerJob;
var appdataScheduler = require('../jobs/appDataRunnerJob');
var stalledJobsFinder = require('../jobs/appDataStalledJobsFinder');

var agenda;

function getAgendaInstance() {
  if (!agenda) {
    var mongoConn = fhconfig.mongoConnectionString('mongo');
    logger.debug('agenda mongo connection = ' + mongoConn);

    //Even though the collection is called appDataExportJobs , the submission export jobs are maintained there also.
    agenda = new Agenda({
      db: {address: mongoConn, collection: 'appDataExportImportJobs-' + os.hostname()},
      name: 'AppDataExportAgenda-' + os.hostname() + '-' + process.pid,
      defaultConcurrency: 1
    }, function() {
      require('../jobs/submissions/submissionExportJob')(agenda);

      appdataScheduler(agenda, fhconfig.value('fhmbaas.appdata_jobs.scheduler'));
      stalledJobsFinder(agenda, fhconfig.value('fhmbaas.appdata_jobs.stalled_job_finder'));
      cleanerJob(agenda, fhconfig.value('fhmbaas.appdataexport.cleaner'));

      agenda.on('fail', function(err, job) {
        logger.warn("app data job failure", {err: err, job: job});
      });
    });
  }
  return agenda;
}

module.exports=getAgendaInstance;