const async = require('async');
const prepareForImport = require('./preparationSteps').prepareForImport;

/**
 * Creates an AppDataImportRunner instance
 * @param context the context of the import. This will contain:
 * - the logger
 * - the jobID
 * - the appDataImportDetails (the mongo doc model)
 * @constructor
 */
function AppDataImportRunner(context) {
  this.context = context;
}

/**
 * Context is as follows:
 * {
 *   input: {
 *     appData: {
 *        guid: appguid    // REQUIRED TO START THE IMPORT
 *        env: environment // REQUIRED TO START THE IMPORT
 *     },
 *     path: filePath      // REQUIRED TO START THE IMPORT
 *     folder: fileFolder  // COMPUTED AUTOMATICALLY
 *   },
 *   output: {
 *    folder: outputFolder // COMPUTED AUTOMATICALLY
 *    files: []            // COMPUTED AUTOMATICALLY
 *   }
 * }
 */
AppDataImportRunner.prototype.run = function(context) {
  async.series(
    async.apply(prepareForImport, context)
  );
};