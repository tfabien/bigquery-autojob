import HBSConfig from '../../src/hbs-config';

import glob from 'glob';

import { TriggerType } from '../../src/auto-job/trigger-type';
import { TemplateData } from '../../src/auto-job/template-data';

import GoogleCloudPlatform from "../../src/google-cloud";
import PubsubEvent = GoogleCloudPlatform.CloudFunctions.PubsubEvent
import StorageEvent = GoogleCloudPlatform.CloudFunctions.StorageEvent
import StorageMessage = GoogleCloudPlatform.Storage.StorageMessage;
import PubsubMessage = GoogleCloudPlatform.PubSub.PubsubMessage;


const event = {
    "bucket": "bq-autoload",
    "contentType": "application/octet-stream",
    "crc32c": "qFknUw==",
    "etag": "CKvIo83t4OICEAE=",
    "generation": 1560236421342251,
    "id": "bq-autoload/archive/MerVentesPriseCdeFinancierAnnulation_20190506.dat/1560236421342251",
    "kind": "storage#object",
    "md5Hash": "gKas4aejLkn7nhpGtdtl1g==",
    "mediaLink": "https://www.googleapis.com/download/storage/v1/b/bq-autoload/o/archive%2FMerVentesPriseCdeFinancierAnnulation_20190506.dat?generation=1560236421342251&alt=media",
    "metageneration": 1,
    "name": "archive/MerVentesPriseCdeFinancierAnnulation_20190506.dat",
    "selfLink": "https://www.googleapis.com/storage/v1/b/bq-autoload/o/archive%2FMerVentesPriseCdeFinancierAnnulation_20190506.dat",
    "size": 1902,
    "storageClass": "REGIONAL",
    "timeCreated": new Date(Date.parse("2019-06-11T07:00:21.341Z")),
    "timeStorageClassUpdated": new Date(Date.parse("2019-06-11T07:00:21.341Z")),
    "updated": new Date(Date.parse("2019-06-11T07:00:21.341Z"))
};
const context = {
    "eventId": "585707448252930",
    "timestamp": new Date(Date.parse("2019-06-11T07:00:22.377Z")),
    "eventType": "google.storage.object.finalize",
    "resource": {
        "service": "storage.googleapis.com",
        "name": "projects/_/buckets/bq-autoload/objects/archive/MerVentesPriseCdeFinancierAnnulation_20190506.dat",
        "type": "storage#object"
    }
};

// Create config object
const config: HBSConfig = new HBSConfig();

// Load templates
const files: Array<string> = glob.sync(__dirname + '/../../config/**/*.hbs');
const p: Promise<any> = Promise.all(files.map(file => config.loadFile(file)));

// Compute
p.then(() => {
    const data: TemplateData = {
        triggerType: TriggerType.Storage,
        event: event,
        context: context,
        file: event as StorageMessage,
        userContext: {},
        env: process.env
    };
    const result:any = config.apply(data)
    console.log(JSON.stringify(result, null, 2));
}).catch(e => {
    console.error(e);
});