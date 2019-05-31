const dot = require('dot-object');
const micromatch = require('micromatch');

const BigQueryAutoload = require('./modules/bigquery-autoload');
const Bucket = require('./modules/gcs-bucket');

const exclude_pattern = '@(mappings|archive)/**/*.*';
const autoload = new BigQueryAutoload();

exports['bigquery-autoload'] = async (file, context) => {
    console.info("Found new file: gs://" + file.bucket + "/" + file.name);
    const matcher = micromatch.matcher(exclude_pattern);
    if (matcher(file.name)) {
        console.info('File matches exclude pattern ("' + exclude_pattern + '"), ignoring...');
    } else {
        const job = await autoload.load(file, context);
        job.on('error', (err) => {
            console.error('Job completed with an error: ' + JSON.stringify(err, null, 2));
        });

        job.on('complete', (metadata) => {
            console.info('Job completed successfully.');
            console.info(dot.dot({ bigquery: metadata }));
        });

    }
};
