import GCSBucket from "../../src/gcs-bucket";

const myBucket = new GCSBucket('bigquery-autojob-test');
myBucket.list().then(files => {
    files.forEach(file => console.log('gs://' + file.bucket.name + '/' + file.name))
}).catch((err) => console.log(err))
