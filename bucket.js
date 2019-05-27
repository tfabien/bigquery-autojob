const _ = require('lodash');
const dot = require('dot-object');
const micromatch = require('micromatch');
const { Storage } = require('@google-cloud/storage');

const files = async function (storage, bucketName, pattern, options) {
  const [files] = await storage.bucket(bucketName).getFiles(options);
  if (pattern) {
    const matcher = micromatch.matcher(pattern);
    return _.filter(files, (file) => { return matcher(file.name) });
  }
  return files;
}

const customMetadatas = async function (storage, file) {
  // Get file metadata
  var [ metadatas ] = await storage.bucket(file.bucket).file(file.name).getMetadata();
  return  metadatas && metadatas['metadata'] ? dot.object(metadatas['metadata']) : null;
}

module.exports = function (bucketName, storageOptions) {
  const storage = new Storage(storageOptions);
  return {
    files: _.bind(files, null, storage, bucketName),
    customMetadatas: _.bind(customMetadatas, null, storage)
  }
}
