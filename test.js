autoload = require('./autoload.js');

const context = {
  file: {
    bucket: 'bq-autoload',
    name: 'cities_20190507.csv'
  },
  env: {
    PROJECT_ID: 'dev-confo',
    DATASET_ID: 'Test'
  }
};
autoload(context);