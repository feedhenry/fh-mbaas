/**
 * Initialize mongodb models on top of a connection
 * Connection start and cleanup handled by fh-mbaas-middleware
 * @param  {mongoose.Connection}   conn mongodb connection
 * @param  {Function} cb         node-style callback
 */
exports.init = function init(conn, cb) {
  try {
    exports.ExportJob = conn.model('ExportJob', require('./ExportJobSchema'));
    exports.File = require('../storage/models/FileSchema').createModel(conn);
  } catch(err) {
    cb(err);
  }
  cb();
};