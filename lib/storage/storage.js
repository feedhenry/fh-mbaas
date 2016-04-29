var storageImplementation = require("./impl/storage_impl");

/**
 * fh-storage module
 *
 * Expose files internal files to be downloaded by clients.
 */
var storage = module.exports;

/**
 * Register new file to be exposed externally with download url.
 *
 * @param fileLocation - file location in local filesystem
 * @param callback
 * @callbackreturns fileReference - reference to registered file that should be stored and passed to generateURL method
 *
 * @exception file not exist or it's not accessible
 * @exception folder location provided. Folders aren't supported by current implementation
 */
storage.registerFile = storageImplementation.registerFile;

/**
 * Generate URL that will be used to download resource.
 * Link will be valid for specified amount of time (expiresIn)
 *
 * @param fileReference - 12-byte string reference returned for registration method
 * @param expiresIn - number of seconds for URL to be valid. After that time new URL will be required. Can be null
 * @param callback
 * @callbackreturns url string - full URI to resource that would be
 *
 * @exception fileReference is invalid. File should be registered first to obtain reference id.
 * @exception file no longer exist or file contents changed
 *
 */
storage.generateURL = storageImplementation.generateURL;

/**
 * Get file details
 *
 * @param fileReference - 12-byte string reference returned for registration method
 * @callbackreturns file details including location and size
 *
 * @exception fileReference is invalid. File should be registered first to obtain reference id.
 */
storage.getFileDetails = storageImplementation.getFileDetails;