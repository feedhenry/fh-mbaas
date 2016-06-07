var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();
var os = require('os');
var Agenda = require('fh-agenda');

var cleanerJob = require('../jobs/appDataExportCleanerJob').cleanerJob;
const CLEANER_JOB_NAME = require('../jobs/appDataExportCleanerJob').JOB_NAME;

var agenda;

const DEFAULT_FREQUENCY = '*/30 * * * *';

function getAgendaInstance() {
  if (!agenda) {
    var mongoConn = fhconfig.mongoConnectionString('mongo');
    logger.debug('agenda mongo connection = ' + mongoConn);

    //Even though the collection is called appDataExportJobs , the submission export jobs are maintained there also.
    agenda = new Agenda({db: {address: mongoConn, collection: 'appDataExportJobs'}});
    agenda.name('AppDataExportAgenda-' + os.hostname + '-' + process.pid);
    require('../jobs/appDataExportJob')(agenda);
    require('../jobs/submissions/submissionExportJob')(agenda);
    cleanerJob(agenda);

    var cleaningFrequency = fhconfig.value('fhmbaas.appdataexport.cleaner.frequency') || DEFAULT_FREQUENCY;

    agenda.every(cleaningFrequency, CLEANER_JOB_NAME);
  }

  return agenda;
}

module.exports=getAgendaInstance;