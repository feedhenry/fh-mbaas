var fhconfig = require('fh-config');
var logger = fhconfig.getLogger();

var os = require('os');

var Agenda = require('fh-agenda');

var agenda;

function getAgendaInstance() {
  if (!agenda) {
    var mongoConn = fhconfig.mongoConnectionString('mongo');
    logger.debug('agenda mongo connection = ' + mongoConn);
    agenda = new Agenda({db: {address: mongoConn, collection: 'appDataExportJobs'}});
    agenda.name('AppDataExportAgenda-' + os.hostname + '-' + process.pid);
    require('./appExportJob')(agenda);
  }

  return agenda;
}

module.exports=getAgendaInstance;