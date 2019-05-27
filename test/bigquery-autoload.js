const _ = require('lodash');

const autoload = require('../modules/bigquery-autoload');

const _f = async () => {
  process.env.PROJECT_ID = 'my-project';
  process.env.DATASET_ID = 'Staging';
  process.env.WRITE_DISPOSITION = 'WRITE_TRUNCATE';

  const file = { bucket: 'bq-autoload', name: 'cities_20190507.csv' };
  const job = await autoload(file);

  job.on('complete', (metadata) => {
    console.log('Job completed successfully.');
  });
  job.on('error', (err) => {
    console.log('Job completed with an error: ' + JSON.stringify(err, null, 2));
  });
};
_f();

