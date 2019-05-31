const _ = require('lodash');

const BigQueryAutoload = require('../modules/bigquery-autoload');
const loader = new BigQueryAutoload();

const _f = async () => {
  process.env.PROJECT_ID = 'dev-confo';
  process.env.DATASET_ID = 'Staging';
  process.env.WRITE_DISPOSITION = 'WRITE_TRUNCATE';

  const file = { bucket: 'bq-autoload', name: 'cities_20190506.csv' };
  const job = await loader.load(file);

  job.on('error', (err) => {
    console.log('Job completed with an error: ' + JSON.stringify(err, null, 2));
  });

  job.on('complete', (metadata) => {
    console.log('Job completed successfully.');
  });
};
_f();

