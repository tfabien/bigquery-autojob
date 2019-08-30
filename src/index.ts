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
import HBSConfig from './hbs-config/index';


export async function autoload(event: StorageMessage, context: StorageEvent, jobOptions ?: Options): Promise<Job> {
    // COmpute job options
    const jobConfig: HBSConfig = new HBSConfig();
    jobConfig.loadFile(__dirname + '/../../config/auto-load/job-config.hbs')
    const _jobOptions = _.merge({}, await jobConfig.apply({ env: process.env }), jobOptions);
    console.log(JSON.stringify(_jobOptions, null, 2));

    // Create job
    const job = await AutoJob.create(TriggerType.Storage, event, context, _jobOptions);
    
    // Run
    return job.run()
        .then(async completedJob => {
            // Log success
            console.info('Job completed successfully.')
            return completedJob
        })
        .then(async completedJob => {
            // Save result to metadata
            const postActionOptions = _jobOptions.postActions && _jobOptions.postActions.saveToMetadata ? _jobOptions.postActions.saveToMetadata : null;
            if (postActionOptions && postActionOptions.use) {
                console.log('Saving job result to file metadata');
                const bucket: GCSBucket = new GCSBucket(event.bucket);
                var metadata = postActionOptions.prefix ? { [postActionOptions.prefix]: completedJob } : completedJob;
                await bucket.setCustomMetadata(event.name, dot.dot(metadata));
            }
            return completedJob;
        })
        .then(async completedJob => {
            // Archive file
            const postActionOptions = _jobOptions.postActions && _jobOptions.postActions.archive ? _jobOptions.postActions.archive : null;
            if (postActionOptions && postActionOptions.use) {
                const bucket = new GCSBucket(event.bucket);
                await bucket.archive(event.name, postActionOptions.bucket, postActionOptions.directory)
            }
            return completedJob;
        });
}