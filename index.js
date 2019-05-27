autoload = require('./autoload.js');

exports['bigquery-autoload'] = async (data, context) => {
    const file = data;
    await autoload(file);
};