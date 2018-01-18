var dataSourceUpdater = require('../../../dataSourceUpdater');

//[db-inspect]
module.exports = function(logger, config, agenda) {

  var dsUpdater = dataSourceUpdater(logger);

  logger.debug("Setting Up Job ", config.agenda);

  agenda.define('data_source_update', function(job, done) {
    logger.info("#data_source_update Starting" );
    var startTime = new Date().getTime();

    dsUpdater.handlers.updateAllEnvDataSourceCache({}, function(err) {
      var endTime = new Date().getTime();
      if (err) {
        logger.error("Error Updating Data Sources", {error: err});
      }
      logger.info("#data_source_update Finished");
      //have to use warn level here as it is the default log level for fh-mbaas
      logger.warn(`#data_source_update time take: ${endTime - startTime}ms`);
      done();
    });

  });

  agenda.every( config.agenda.jobs.data_source_update.schedule, 'data_source_update' );
};

