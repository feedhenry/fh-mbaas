var Agenda = require('fh-agenda');
var os = require('os');
var _ = require('underscore');

/**
 * Starts scheduled (agenda) jobs processing,
 *
 * agenda can be disabled in configuration,
 * the list of jobs to be performed by given node is specified in configuration.
 *
 * Jobs are stored under ./jobs/ directory and referenced by job_name (corresponding to job_name in configuration).
 *
 * Sample configuration:
 *
 * {
 *   agenda: {
 *     enabled: true,
 *     jobs: {
 *       job_name: {
 *         // job configuration
 *       }
 *     }
 *   }
 * }
 *
 * @param logger fh-logger instance
 * @param config configuration for this fh-messaging process
 * @param mongoConnectionString the MongoDB db connection that agenda jobs will be stored in
 * @returns {{tearDown: Function}}
 */
module.exports = function( logger, config, mongoConnectionString ) {
  var agenda;

  if (config.agenda && !config.agenda.enabled ) {
    logger.info( 'Agenda is disabled, skipping' );
  } else {
    var jobTypes = ( config.agenda && config.agenda.jobs ) ? Object.keys(config.agenda.jobs) : [];

    if ( !jobTypes.length ) {
      logger.info( 'No Agenda jobs specified, skipping' );
    } else {
      logger.info( 'Setting up Agenda', process.pid );
      agenda = new Agenda({
        db: {address: mongoConnectionString, collection: 'agendaJobs'},
        name: os.hostname() + '-' + process.pid,
        defaultConcurrency: 1,
        defaultLockLifetime: 10000
      }, function() {
        jobTypes.forEach( function( type ) {
          require( './jobs/' + type )( logger, config, agenda );
        });

        agenda.on('fail', function(err, job) {
          logger.warn("Job Fail ", {err: err, job: job});
        });

        agenda.start();
        logger.info( 'Agenda set up' );
      });
    }
  }

  // Public API
  return {
    /**
     * Stops the job queue processing and unlocks currently running jobs.
     *
     * If agenda wasn't set up, calls callback immediately.
     *
     * @param callback called when agenda is stopped
     */
    tearDown: function( callback ) {
      callback = callback || _.noop;
      if ( agenda && agenda.stop ) {
        logger.info("Stopping Agenda");
        agenda.stop(function() {
          logger.info("Agenda stopped");
          callback();
        });
      } else {
        callback();
      }
    }
  };
};