const _ = require('lodash');
const glob = require('glob');
const {BigQuery} = require('@google-cloud/bigquery');

const Config = require('./config.js');
const Bucket = require('./bucket.js');

const getJobConfiguration = async function (context) {
  // Init mappings configuration
  const mappings = new Config();

  // Load packaged mappings files
  _.each(glob.sync("./mappings/**/*.hbs"), function (file) {
    mappings.loadFile(file);
  });

  // Init GCS bucket
  const bucket = new Bucket(context.file.bucket);

  // Load GCS mappings files
  const files = await bucket.files('mappings/**/*.hbs', { prefix: 'mappings/' });
  for (const file of files) {
    console.log(file.name)
    const stream = file.createReadStream();
    await mappings.loadStream(stream);
  }

  // Load mapping from metadata
  const customMetadatas = await bucket.customMetadatas(context.file);
  if (customMetadatas && customMetadatas['bigquery']) {
    mappings.load(JSON.stringify(customMetadatas['bigquery'], null, 2));
  }

  // Compute
  return mappings.compute(context);
}

module.exports = async function (context) {
  // Compute job configuration
  const jobConfiguration = await getJobConfiguration(context);

  // Loads data from file into the table
  console.log("Loading into table with following configuration:");
  JSON.stringify(jobConfiguration, null, 2);
  const job = new BigQuery().createJob(jobConfiguration);
}