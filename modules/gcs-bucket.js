const _ = require('lodash');
const dot = require('dot-object');
const micromatch = require('micromatch');
const path = require('path');

const { Storage } = require('@google-cloud/storage');

// ---------------------
// Export
// ---------------------
module.exports = Bucket;

function Bucket(bucketName, storageOptions = null) {
  this._storage = new Storage(storageOptions);
  this._bucket = this._storage.bucket(bucketName);
}

// ---------------------
// Private
// ---------------------

var _storage = null;
var _bucket = null;

// ---------------------
// Public
// ---------------------

// List files
Bucket.prototype.list = async function (pattern, options) {
  const [files] = await this._bucket.getFiles(options);
  if (pattern) {
    const matcher = micromatch.matcher(pattern);
    return _.filter(files, (file) => { return matcher(file.name) });
  }
  return files;
}

// Set file's custom metadatas
Bucket.prototype.archive = async function (filePath, archiveDir) {
  var fileName = path.basename(filePath);
  const fileExists = await this._bucket.file(filePath).exists();
  if (fileExists) {
    var newfileName = fileName + '.' + _.now();
    console.log(fileName + ' already exists, renaming to ' + newfileName);
    fileName = newfileName;
  }
  return this._bucket.file(filePath).move(archiveDir + '/' + fileName);
}

// Get file's custom metadatas
Bucket.prototype.getCustomMetadata = async function (filePath) {
  var [metadatas] = await this._bucket.file(filePath).getMetadata();
  return metadatas && metadatas['metadata'] ? dot.object(metadatas['metadata']) : null;
}

// Set file's custom metadatas
Bucket.prototype.setCustomMetadata = function (filePath, customMetadata) {
  return this._bucket.file(filePath).setMetadata({ metadata: customMetadata });
}