const dot = require('dot-object');
const micromatch = require('micromatch');

const BigQueryAutoload = require('./modules/bigquery-autoload');
const Bucket = require('./modules/gcs-bucket');

const exclude_pattern = '@(mappings|archive)/**/*.*';
const loader = new BigQueryAutoload();

exports['bigquery-autoload'] = async (file, context) => {
    console.info("Found new file: gs://" + file.bucket + "/" + file.name);
    const matcher = micromatch.matcher(exclude_pattern);
    if (matcher(file.name)) {
        console.info('File matches exclude pattern ("' + exclude_pattern + '"), ignoring...');
    } else {
        return loader.process(file, context)
            .then(
                () => {
                    console.info('Job completed successfully.');
                },
                (err) => {
                    console.error('Job completed with an error: ' + JSON.stringify(err, null, 2));
                }
            );
    }
};

process.env.PROJECT_ID = 'dev-confo';
process.env.DATASET_ID = 'Test';
process.env.WRITE_DISPOSITION = 'WRITE_TRUNCATE';
process.env.DRY_RUN = 'False';
const file = { bucket: 'bq-autoload', name: 'cities_20190506.csv' };
exports['bigquery-autoload'](file, null);
