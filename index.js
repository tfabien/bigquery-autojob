const autoload = require('./modules/bigquery-autoload');

const MAPPINGS_DIR = 'mappings';

exports['bigquery-autoload'] = async (file, context) => {
    console.log("Found new file: gs://" + file.bucket + "/" + file.name);
    autoload(file, context);
};