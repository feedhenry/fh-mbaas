var dataSourceUpdater = require('../../../dataSourceUpdater');

module.exports = function(logger, config, agenda) {

  var dsUpdater = dataSourceUpdater(logger);

  logger.debug("Setting Up Job ", config.agenda);

  agenda.define('data_source_update', function(job, done) {
    logger.info("#data_source_update Starting" );

    dsUpdater.handlers.updateAllEnvDataSourceCache({}, function(err) {
      if (err) {
        logger.error("Error Updating Data Sources", {error: err});
      }
      logger.info("#data_source_update Finished");

      done();
    });

  });

  agenda.every( config.agenda.jobs.data_source_update.schedule, 'data_source_update' );
};

