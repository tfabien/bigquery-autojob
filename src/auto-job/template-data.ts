import { ProcessEnvOptions } from "child_process";

import { TriggerType } from "./trigger-type";

import GoogleCloudPlatform from "../google-cloud";
import PubsubEvent = GoogleCloudPlatform.CloudFunctions.PubsubEvent
import StorageEvent = GoogleCloudPlatform.CloudFunctions.StorageEvent
import StorageMessage = GoogleCloudPlatform.Storage.StorageMessage;
import PubsubMessage = GoogleCloudPlatform.PubSub.PubsubMessage;


export interface TemplateData {
    triggerType: TriggerType;
    /**
     * The event's data
     */
    event: StorageMessage | PubsubMessage;
    /**
     * Alias of 'event', only if triggered by Storage
     */
    file?: StorageMessage;
    /**
     * Alias of 'event', only if triggered by PubSub
     */
    message?: PubsubMessage;
    /**
     * The event's context
     */
    context: StorageEvent | PubsubEvent;
    /**
     * User provided context, set through 'options'
     */
    userContext: any;
    /**
     * Process env
     */
    env: ProcessEnvOptions;
}
