const Extract = require('./extractCommand').Extract;

function TarWrapper(file) {
  this.file = file;
}

TarWrapper.prototype.extract = function() {
  return new Extract()
    .withFile(this.file);
};

module.exports.TarWrapper = TarWrapper;
