import GoogleCloudPlatform from "../../src/google-cloud";


import { autoload } from '../../src/index';
import { Options } from '../../src/auto-job/options';

const event = {
    "bucket": "bigquery-autojob-test",
    "name": "Test/cities/cities_noheader_20190506.csv"
};
const context = {
    "eventId": "585707448252930",
    "timestamp": new Date(Date.parse("2019-06-11T07:00:22.377Z")),
    "eventType": "google.storage.object.finalize",
    "resource": {
        "service": "storage.googleapis.com",
        "name": "projects/_/buckets/bigquery-autojob-test/objects/Test/cities/cities_noheader_20190506.csv",
        "type": "storage#object"
    }
};

process.env.PROJECT_ID = 'dev-confo'
process.env.DATASET_ID = 'Test';
process.env.DRY_RUN = 'false';
const autoloadOptions = { postActions: { archive: { use: true, bucket: 'bigquery-autojob-test-archive', directory: '' } } }

autoload(event, context, autoloadOptions)
    .then(() => console.log('Test completed successfully'))
    .catch(e => console.log('Test completed with error %s', e))