const _ = require('lodash');
const glob = require('glob');

const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery();

const Config = require('./hbs-config');
const Bucket = require('./gcs-bucket');

const MAPPINGS_DIR = 'mappings';
const CUSTOM_METADATA_PREFIX = 'bigquery';

const getJobConfiguration = async function (gcsFile, userContext) {
  // Init mappings configuration
  var mappings = new Config();

  // Load packaged mappings files
  _.each(glob.sync(__dirname + "/../mappings/**/*.hbs"), (f) => { console.debug(f); mappings.loadFile(f) });

  // Init GCS bucket
  const bucket = new Bucket(gcsFile.bucket);

  // Load GCS mappings files
  const files = await bucket.listFiles(MAPPINGS_DIR + '/**/*.hbs', { prefix: MAPPINGS_DIR + '/' });
  for (const f of files) { console.debug('gs://' + f.bucket.name + '/' + f.name); mappings.loadStream(f.createReadStream()) }

  // Load mapping from metadata
  const customMetadatas = await bucket.customMetadatas(gcsFile);
  if (customMetadatas && customMetadatas[CUSTOM_METADATA_PREFIX]) {
    const document  = JSON.stringify(customMetadatas[CUSTOM_METADATA_PREFIX], null, 2);
    console.debug('metadata: ' + document);
    mappings.load(document);
  }

  // Compute
  return mappings.compute({
    file: gcsFile,
    userContext: userContext,
    env: process.env
  });
}

module.exports = async function (gcsFile, userContext) {
  // Ignore mapping files
  if (gcsFile.name.startsWith(MAPPINGS_DIR)) {
    console.log("File is located in mappings directory, ignoring...");
  } else {
    // Compute job configuration
    const jobConfiguration = await getJobConfiguration(gcsFile, userContext);

    // Load data from file into the table
    console.log("Loading into table with following configuration:");
    console.log(JSON.stringify(jobConfiguration, null, 2));
    const [job] = await bq.createJob(jobConfiguration);
    return job;
  }
}