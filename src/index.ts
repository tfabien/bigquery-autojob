import dot from 'dot-object';
import _ from 'lodash';

import GoogleCloudPlatform from "./google-cloud";
import StorageEvent = GoogleCloudPlatform.CloudFunctions.StorageEvent
import StorageMessage = GoogleCloudPlatform.Storage.StorageMessage;

import { Job } from '@google-cloud/bigquery';

import AutoJob from './auto-job';
import { Options } from "./auto-job/options";
import { TriggerType } from './auto-job/trigger-type';

import GCSBucket from './gcs-bucket';


export async function autoload(event: StorageMessage, context: StorageEvent, jobOptions?: Options): Promise<Job> {
    const defaultJobOptions: Options = {
        configurationSources: {
            local: { use: true },
            GCS: { use: true, getFilesOptions: { prefix: 'mappings/' } },
            customMetadata: {
                file: { use: true, prefix: 'autoload' },
                sidecarFile: { use: true },
                directory: { use: true }
            }
        },
        postActions: {
            saveToMetadata: true,
            archiveFile: true,
            archiveDir: 'ARCHIVE'
        }
    };
    const _jobOptions = _.merge({}, defaultJobOptions, jobOptions);
    const job = await AutoJob.create(TriggerType.Storage, event, context, _jobOptions);
    return job.run()
        .then(async completedJob => {
            // Log success
            console.info('Job completed successfully.')
            return completedJob
        })
        .then(async completedJob => {
            // Save result to metadata
            if (_jobOptions.postActions && _jobOptions.postActions.saveToMetadata) {
                console.log('Saving job result to file metadata');
                const bucket: GCSBucket = new GCSBucket(event.bucket);
                await bucket.setCustomMetadata(event.name, dot.dot(completedJob));
            }
            return completedJob;
        })
        .then(async completedJob => {
            // Archive file
            if (_jobOptions.postActions && _jobOptions.postActions.archiveFile && _jobOptions.postActions.archiveDir) {
                console.log('Archiving file to ' + _jobOptions.postActions.archiveDir);
                const bucket = new GCSBucket(event.bucket);
                await bucket.archive(event.name, _jobOptions.postActions.archiveDir)
            }
            return completedJob;
        });
}