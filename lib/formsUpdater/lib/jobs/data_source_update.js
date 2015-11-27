var dataSourceUpdater = require('../../../dataSourceUpdater');

module.exports = function(logger, config, agenda){

  logger.debug("Setting Up Job ", config.agenda);

  agenda.define('data_source_update', function(job, done){
    logger.info("#data_source_update Starting" ,  process.pid);

    dataSourceUpdater.handlers.updateAllEnvDataSourceCache({}, function(err){
      if(err){
        logger.error("Error Updating Data Sources", {error: err});
      }

      done();
    });

  });

  agenda.every( config.agenda.jobs.data_source_update.schedule, 'data_source_update' );
};

