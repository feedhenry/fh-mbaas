var child_process = require('child_process');
const addParam = require('../commandUtils').addParam;
const addBooleanParam = require('../commandUtils').addBooleanParam;
const TAR = 'tar';

function Extract() {
  this.paramsMap = {};

  var self = this;

  // Fluent api to be used for configuring

  /**
   * Sets the tar file to be extracted
   * @param path
   * @returns {Extract}
   */
  this.withFile = function(path) {
    self.paramsMap.file = path;
    return self;
  };

  /**
   * Don't replace existing files when extracting
   * @returns {Extract}
   */
  this.withKeepOldFiles = function() {
    self.paramsMap.keepOldFiles = true;
    return self;
  };

  /**
   * don't replace existing files that are newer than
   * their archive copies
   * @returns {Extract}
   */
  this.withKeepNewerFiles = function() {
    self.paramsMap.keepNewerFiles = true;
    return self;
  };

  /**
   * overwrite metadata of existing directories when
   * extracting (default)
   * @param overwrite
   * @returns {Extract}
   */
  this.withOverwriteDir = function(overwrite) {
    self.paramsMap.overwriteDir = overwrite;
    return self;
  };

  /**
   * Overwrite existing files when extracting
   * @returns {Extract}
   */
  this.withOverwrite = function() {
    self.paramsMap.overwrite = true;
    return self;
  };

  /**
   * Empty hierarchies prior to extracting directory
   * @returns {Extract}
   */
  this.withRecursiveUnlink = function() {
    self.paramsMap.recursiveUnlink = true;
    return self;
  };

  /**
   * remove each file prior to extracting over it
   * @returns {Extract}
   */
  this.withUnlinkFirst = function() {
    self.paramsMap.unlinkFirst = true;
    return self;
  };

  /**
   * ignore exit codes of children
   * @param ignore
   * @returns {Extract}
   */
  this.withIgnoreCommandError = function(ignore) {
    self.paramsMap.ignoreCommandError = ignore;
    return self;
  };

  /**
   * extract files to standard output
   * @returns {Extract}
   */
  this.withOutToStdOut = function() {
    self.paramsMap.stdout = true;
    return self;
  };

  /**
   * pipe extracted files to another program
   * @param toCommand
   * @returns {Extract}
   */
  this.withToCommand = function(toCommand) {
    self.paramsMap.toCommand = toCommand;
    return self;
  };

  /**
   * preserve access times on dumped files, either
   * by restoring the times after reading (if atimeFilePreserve == true or 'replace'; default)
   * or by not setting the times in the first place (atimeFilePreserve='system')
   * @param atimeFilePreserve
   * @returns {Extract}
   */
  this.withATimeFilePreserve = function(atimeFilePreserve) {
    self.paramsMap.atimeFilePreserve = atimeFilePreserve;
    return self;
  };

  /**
   * Delay setting modification times and
   * permissions of extracted directories until the end
   * of extraction
   * @param delayDirectoryRestore
   * @returns {Extract}
   */
  this.withDelayDirectoryRestore = function(delayDirectoryRestore) {
    self.paramsMap.delayDirectoryRestore = delayDirectoryRestore;
    return self;
  };

  /**
   * don't extract file modified time
   * @returns {Extract}
   */
  this.withTouch = function() {
    self.paramsMap.touch = true;
    return self;
  };

  /**
   * try extracting files with the same ownership as
   * exists in the archive (default for superuser)
   * @param sameOwner
   * @returns {Extract}
   */
  this.withSameOwner = function(sameOwner) {
    self.paramsMap.noSameOwner = sameOwner;
    return self;
  };

  /**
   * Preserve the permission (if samePermission == true), otherwise
   * apply the user's umask when extracting permissions
   * from the archive (default for ordinary users)
   * @param samePermission
   * @returns {Extract}
   */
  this.withSamePermissions = function(samePermission) {
    self.paramsMap.noSamePermissions = samePermission;
    return self;
  };

  /**
   * always use numbers for user/group names
   * @returns {Extract}
   */
  this.withNumericOwner = function() {
    self.paramsMap.numericOwner = true;
    return self;
  };

  /**
   * Current working directory
   * @param cwd
   * @returns {Extract}
   */
  this.withCWD = function(cwd) {
    self.paramsMap.cwd = cwd;
    return self;
  };
}

function addParamAutoDetect(result, paramsMap, key, param, negate) {
  if (paramsMap[key] === true) {
    addBooleanParam(result, paramsMap, key, param, negate);
  } else if (paramsMap[key]) {
    addParam(result, paramsMap, key, param);
  }
}

function buildParamsAry(paramsMap) {
  var result = ['--extract'];

  addParamAutoDetect(result, paramsMap, 'keepOldFiles', '--keep-old-files');
  addParamAutoDetect(result, paramsMap, 'keepNewerFiles', '--keep-newer-files');
  addParamAutoDetect(result, paramsMap, 'overwriteDir', '--overwrite-dir');
  addParamAutoDetect(result, paramsMap, 'overwriteDir', '--no-overwrite-dir', true);
  addParamAutoDetect(result, paramsMap, 'overwrite', '--overwrite');
  addParamAutoDetect(result, paramsMap, 'recursiveUnlink', '--recursive-unlink');
  addParamAutoDetect(result, paramsMap, 'unlinkFirst', '--unlink-first');
  addParamAutoDetect(result, paramsMap, 'ignoreCommandError', '--ignore-command-error');
  addParamAutoDetect(result, paramsMap, 'stdout', '--to-stdout');
  addParamAutoDetect(result, paramsMap, 'toCommand', '--to-command');
  addParamAutoDetect(result, paramsMap, 'atimeFilePreserve', '--atime-preserve');
  addParamAutoDetect(result, paramsMap, 'delayDirectoryRestore', '--delay-directory-restore');
  addParamAutoDetect(result, paramsMap, 'touch', '--touch');
  addParamAutoDetect(result, paramsMap, 'sameOwner', '--same-owner');
  addParamAutoDetect(result, paramsMap, 'sameOwner', '--no-same-owner', true);

  addParamAutoDetect(result, paramsMap, 'samePermissions', '--same-permissions');
  addParamAutoDetect(result, paramsMap, 'samePermissions', '--no-same-permissions', true);

  addParamAutoDetect(result, paramsMap, 'numericOwner', '--numeric-owner');
  addParamAutoDetect(result, paramsMap, 'owner', '--owner');

  addParamAutoDetect(result, paramsMap, 'file', '--file');

  return result;
}

/**
 * Spawns the restore command with the configured parameters
 * @returns {*}
 */
Extract.prototype.run = function() {

  if (!this.paramsMap.file) {
    throw new Error('Path to the file to untar is mandatory');
  }

  var params = buildParamsAry(this.paramsMap);

  if (this.paramsMap.cwd) {
    return child_process.spawn(TAR, params, {cwd: this.paramsMap.cwd});
  } else {
    return child_process.spawn(TAR, params);
  }
};

module.exports.Extract = Extract;