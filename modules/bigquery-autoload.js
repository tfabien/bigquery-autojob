const _ = require('lodash');
const glob = require('glob');
const extend = require('extend');
const dot = require('dot-object');

const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery();

const Config = require('./hbs-config');
const Bucket = require('./gcs-bucket');

// ---------------------
// Export
// ---------------------
module.exports = BigQueryAutoload;

function BigQueryAutoload(options) {
  this._options = extend(true, _defaultOptions, options);
}

// ---------------------
// Private
// ---------------------

const _defaultOptions = {
  mappingsDir: 'mappings',
  customMetaPrefix: 'bigquery',
  saveResult: true,
  archiveDir: 'archive'
}

BigQueryAutoload.prototype._loadMappings = async function (gcsFile, userContext) {
  // Init mappings configuration
  var mappings = new Config();

  // Load packaged mappings files
  _.each(glob.sync(__dirname + "/../mappings/**/*.hbs"), (f) => {
    mappings.loadFile(f)
  });

  // Init GCS bucket
  const bucket = new Bucket(gcsFile.bucket);

  // Load GCS mappings files
  const files = await bucket.list(this._options.mappingsDir + '/**/*.hbs', { prefix: this._options.mappingsDir + '/' });
  for (const f of files) {
    const streamName = 'gs://' + f.bucket.name + '/' + f.name;
    mappings.loadStream(streamName, f.createReadStream())
  }

  // Load mapping from metadata
  const customMetadatas = await bucket.getCustomMetadata(gcsFile.name);
  if (customMetadatas && customMetadatas[this._options.customMetaPrefix]) {
    const document = JSON.stringify(customMetadatas[options.customMetaPrefix], null, 2);
    mappings.load('metadata', document);
  }

  return mappings;
}

BigQueryAutoload.prototype._getJobConfiguration = async function (gcsFile, userContext) {
  // Load mappings
  const mappings = await this._loadMappings(gcsFile, userContext);

  // Compute
  return mappings.compute({
    file: gcsFile,
    userContext: userContext,
    env: process.env
  });
}

// ---------------------
// Public
// ---------------------

BigQueryAutoload.prototype.load = async function (gcsFile, userContext) {
  // Compute job configuration
  const jobConfiguration = await this._getJobConfiguration(gcsFile, userContext);

  // Load data from file into the table
  console.log("Creating job with the following configuration:");
  console.log(JSON.stringify(jobConfiguration, null, 2));
  const [job] = await bq.createJob(jobConfiguration);

  return job;
}

BigQueryAutoload.prototype.process = function (gcsFile, userContext) {
  const that = this;
  // Execute load job
  return this.load(gcsFile, userContext)
    .then((jobResult) => {
      // Save result to metadata
      if (that._options.saveResult) {
        console.log('Saving job result to file metadata');
        const bucket = new Bucket(gcsFile.bucket);
        return bucket.setCustomMetadata(gcsFile.name, dot.dot(jobResult));
      }
      return new Promise();
    })
    .then((job) => {
      // Archive file
      if (that._options.archiveDir) {
        console.log('Archiving file to ' + that._options.archiveDir);
        const bucket = new Bucket(gcsFile.bucket);
        return bucket.archive(gcsFile.name, that._options.archiveDir);
      }
      return new Promise();
    });
}