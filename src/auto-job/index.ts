import glob from 'glob';
import _ from 'lodash';
import path from 'path';

import GCSBucket from '../gcs-bucket';
import HBSConfig from '../hbs-config';
import { TemplateData } from "./template-data";
import { Options } from "./options";

import { BigQuery, Job, JobRequest } from '@google-cloud/bigquery';
import bigquery from "@google-cloud/bigquery/build/src/types";
import { File } from '@google-cloud/storage';

import GoogleCloudPlatform from "../google-cloud";
import PubsubEvent = GoogleCloudPlatform.CloudFunctions.PubsubEvent
import StorageEvent = GoogleCloudPlatform.CloudFunctions.StorageEvent
import StorageMessage = GoogleCloudPlatform.Storage.StorageMessage;
import PubsubMessage = GoogleCloudPlatform.PubSub.PubsubMessage;

import { TriggerType } from './trigger-type';
import dot from 'dot-object';
import properties from "properties";

export default class AutoJob {

    private triggerType: TriggerType;
    private event: StorageMessage | PubsubMessage;
    private context: StorageEvent | PubsubEvent;
    private options: Options;

    private hbsConfig: HBSConfig = new HBSConfig();

    public jobConfiguration: JobRequest<bigquery.IJob>;

    private defaultOptions: Options = {
        configurationSources: {
            local: {
                use: true,
                includePattern: __dirname + "/../../**/*.hbs"
            },
            GCS: {
                use: false,
                bucketName: null, //same as the file
                includePattern: '/config/**/*/hbs'
            },
            metadata: {
                file: { use: false, prefix: 'autojob' },
                sidecar: { use: false, suffix: '.metadata' },
                directory: { use: false, fileName: '.metadata' }
            }
        },
        userContext: {},
        postActions: {
            saveToMetadata: {
                use: false,
                prefix: 'autojob'
            },
            archive: {
                use: false,
                bucket: null,
                directory: 'archive'
            }
        }
    }

    // Hide constructor
    private constructor(triggerType: TriggerType, event: StorageMessage | PubsubMessage, context: StorageEvent | PubsubEvent, options?: Options) {
        this.triggerType = triggerType;
        this.event = event;
        this.context = context;

        // Merge options
        this.options = _.merge({}, this.defaultOptions, options);
    }

    /**
     * Create an autoJob for the CloudFunction event and context
     */
    public static async create(triggerType: TriggerType, event: StorageMessage | PubsubMessage, context: StorageEvent | PubsubEvent, options?: Options): Promise<AutoJob> {
        const autoJob = new AutoJob(triggerType, event, context, options);
        return autoJob.prepare();
    }

    private async prepare(): Promise<AutoJob> {
        // If active, load config templates from local FS
        if (this.options.configurationSources.local.use) {
            const options = this.options.configurationSources.local;
            _.map(glob.sync(options.includePattern), file => this.hbsConfig.loadFile(file))
        }

        // If active, load config templates from GCS
        if (this.options.configurationSources.GCS.use) {
            const options = this.options.configurationSources.GCS;

            // Determine bucket's name
            const defaultBucket = this.triggerType === TriggerType.Storage ? (this.event as StorageMessage).bucket : null;
            const bucketName = options.bucketName ? options.bucketName : defaultBucket;
            if (!bucketName) {
                throw (new Error('No bucket name specified for GCS configuration templates'))
            }
            const bucket: GCSBucket = new GCSBucket(bucketName);

            // Load configuration templates
            const files: Array<File> = await bucket.list(options.includePattern, options.getFilesOptions);
            await Promise.all(_.map(files, (f: File) => this.hbsConfig.loadStream('gcs://' + f.bucket.name + '/' + f.name, f.createReadStream())));
        }

        // If triggered by a Storage event and customMetadata source is active, load config templates from file's metadata
        if (this.triggerType === TriggerType.Storage) {
            const customMetaOptions = this.options.configurationSources.metadata;
            const file: StorageMessage = this.event as StorageMessage;
            const bucket: GCSBucket = new GCSBucket(file.bucket);

            const loadProperties = async (fileName) => {
                console.log('Loading metadata from ' + fileName);
                var content: string = await bucket.read(fileName) as string;
                const props: Map<string, any> = properties.parse(content, {
                    sections: true,
                    namespaces: false,
                    comments: [";", "#"],
                    separators: [ "=", ":" ]
                });
                console.debug(JSON.stringify(dot.dot(props), null, 2));
                return this.hbsConfig.load(fileName, JSON.stringify(dot.object(props), null, 2));
            }

            // Directory metadata
            if (customMetaOptions.directory.use) {                
                const fileName = path.dirname(file.name) + '/' + customMetaOptions.directory.fileName;
                if (await bucket.exists(fileName)) {
                   await loadProperties(fileName);
                }
            }

            // Sidecar metadata file
            if (customMetaOptions.sidecar.use) {
                const fileName = file.name + customMetaOptions.sidecar.suffix;
                if (await bucket.exists(fileName)) {
                    await loadProperties(fileName);
                 }
            }

            // GCS file's metadata
            if (customMetaOptions.file.use) {
                const customMeta: Map<String, Object> = await bucket.getCustomMetadata(file.name);
                if (customMeta && customMeta[customMetaOptions.file.prefix]) {
                    const source = JSON.stringify(dot.object(customMeta[customMetaOptions.file.prefix]), null, 2);
                    this.hbsConfig.load('fileMetadata', source);
                }
            }
        }

        return Promise.resolve(this);
    }

    /**
     * Run job and await completion (promise is resolved when the job is completed)
     */
    public async run(): Promise<Job> {
        const job: Job = await this.fire();
        return new Promise<Job>((resolve, reject) => {
            console.log('Awaiting job completion...');
            job.on('complete', completedJob => resolve(completedJob));
            job.on('error', err => reject(err));
        });
    }

    /**
     * Run job, don't await completion (promise is resolved as soon as the job is created)
     */
    public async fire(): Promise<Job> {
        // Prepare template data
        const data: TemplateData = {
            triggerType: this.triggerType,
            event: this.event,
            context: this.context,
            userContext: this.options.userContext,
            env: process.env
        };
        // If triggered by a Storage event, add a 'file' alias to the event
        if (this.triggerType === TriggerType.Storage) {
            data.file = data.event as StorageMessage;
        }
        // If triggered by a PubSub event, add a 'message' alias to the event
        if (this.triggerType === TriggerType.PubSub) {
            data.message = data.event as PubsubMessage;
        }

        // Compute job configuration
        this.jobConfiguration = await this.hbsConfig.apply(data);

        // Reject if job configuration is empty
        if (_.isEmpty(this.jobConfiguration)) {
            throw (new Error('Resulting job configuration is empty'));
        }

        // Create and fire BigQuery job
        console.info("Creating job with the following configuration:");
        console.info(JSON.stringify(this.jobConfiguration, null, 2));
        const [job] = await new BigQuery().createJob(this.jobConfiguration);
        return job;
    }
}


