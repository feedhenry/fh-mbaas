var async = require('async');
var path = require('path');
var exec = require('child_process').exec;

/**
 * Remove all the temporary files.
 *
 * @param context the context of the current export process.
 * @param cb
 * @returns {*}
 */
function removeTempFiles(context, cb) {
  if (!context.path) {
    // Nothing to clean
    return cb();
  }

  var command = 'rm -f ' + path.join(context.path, '*.gz');
  exec(command, cb);
}

/**
 *
 * Generic cleanup module for export jobs.
 *
 * @param context
 * @param cb
 * @returns {*}
 */
module.exports = function cleanUp(context, cb) {
  var logger = context.logger;
  logger.info('Cleaning up');
  if (context.db) {
    async.parallel(
      [
        context.db.close.bind(context.db),
        async.apply(removeTempFiles, context)
      ], function(err) {
      if (err) {
        logger.error('Error cleaning up', {err: err});
      }
      return cb(err);
    }
    );
  } else {
    // If the DB is not connected there is nothing to clean up
    return cb();
  }
};