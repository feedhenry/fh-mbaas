var mkdirp = require('mkdirp');
var fhConfig = require('fh-config');
var multer = require('multer');
const TMP_FORMS_FILE_FOLDER_PATH = "fhmbaas.temp_forms_files_dest";
var multerMiddleare;


/**
 *
 * Middleware to ensure that the folder pointed to by fhmbaas.temp_forms_files_dest exists.
 *
 * The folder will be created if it does not already exist.
 *
 * @param req
 * @param res
 * @param next
 */
function ensureTmpFileFolderExists(req, res, next) {
  //Ensuring that the folder for files exists before cacheing the file
  mkdirp(fhConfig.value(TMP_FORMS_FILE_FOLDER_PATH), next);
}

/**
 *
 * Creating a middleware array to ensure that the temporary storage folder
 * for files exists before attempting to parse the file with multer
 *
 * @returns {*[]}
 */
module.exports = function getFileUploadMiddleware() {
  multerMiddleare = multerMiddleare || multer({
    dest: fhConfig.value(TMP_FORMS_FILE_FOLDER_PATH)
  });

  return [ensureTmpFileFolderExists, multerMiddleare];
};