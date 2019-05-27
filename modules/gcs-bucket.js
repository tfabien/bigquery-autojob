const _ = require('lodash');
const dot = require('dot-object');
const micromatch = require('micromatch');

const { Storage } = require('@google-cloud/storage');

// ---------------------
// Export
// ---------------------
module.exports = Bucket;

function Bucket(bucketName, storageOptions = null) {
  this._bucketName = bucketName;
  this._storage = new Storage(storageOptions);
}

// ---------------------
// Private
// ---------------------

var _storage = null;
var _bucketName = null;

// ---------------------
// Public
// ---------------------

// List files
Bucket.prototype.listFiles = async function (pattern, options) {
  const [files] = await this._storage.bucket(this._bucketName).getFiles(options);
  if (pattern) {
    const matcher = micromatch.matcher(pattern);
    return _.filter(files, (file) => { return matcher(file.name) });
  }
  return files;
}

// Get file's custom metadatas
Bucket.prototype.customMetadatas = async function (file) {
  var [metadatas] = await this._storage.bucket(file.bucket).file(file.name).getMetadata();
  return metadatas && metadatas['metadata'] ? dot.object(metadatas['metadata']) : null;
}

