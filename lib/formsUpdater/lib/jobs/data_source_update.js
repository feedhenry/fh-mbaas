

module.exports = function(logger, config, agenda){

  logger.debug("Setting Up Job ", config.agenda);

  agenda.define('data_source_update', function(job, done){
    logger.info("#data_source_update Starting" ,  process.pid);
    setTimeout(function(){
      logger.info("#data_source_update Finished" ,  process.pid);
      done();
    }, 3000);

  });

  agenda.every( config.agenda.jobs.data_source_update.schedule, 'data_source_update' );
};

