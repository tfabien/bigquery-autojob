const _ = require('lodash');

const Bucket = require('../gcs-bucket');

const _f = async () => {
    const myBucket = new Bucket('bq-autoload');
    const files = await myBucket.listFiles('**/*');
    _.each(files, (file) => { console.log('gs://' + file.bucket.name + '/' + file.name) })
};
_f();