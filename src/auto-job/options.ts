import { GetFilesOptions } from '@google-cloud/storage';

export interface Options {
    /**
     * Sources for job configuration templates
     */
    configurationSources?: {
        /**
         * Files from the local filesystem of the deployed CloudFunction
         */
        local?: {
            /**
             * Should these templates be used?
             */
            use?: boolean,
            /**
             * glob include pattern
             */
            includePattern?: string;
        },
        /**
         * Files read from a GCS bucket
         */
        GCS?: {
            /**
             * Should these templates be used?
             */
            use?: boolean,
            /**
             * The GCS bucket name
             * Use 'null' to use the smae bucket as the triggering file ('Storage' TriggerType only)
             */
            bucketName?: string,
            /**
             * glob include pattern
             */
            includePattern?: string,
            /**
             * Additionnal options used for listing the GCS files
             */
            getFilesOptions?: GetFilesOptions
        },
        /**
         * Custom metadata from the triggering GCS file
         * Note: Ignored if TriggerType is not 'Storage'
         */
        customMetadata?: {
            /**
             * Custom metadata from the triggering GCS file
             */
            file?: {
                /**
                 * Should these templates be used?
                 */
                use?: boolean,

                /**
                 * Only use custom metadatas starting with this prefix
                 */
                prefix?: string
            },
            /**
             * Custom metadata from a file relative to the triggering GCS file
             */
            sidecarFile?: {
                use?: boolean,
                suffix?: string
            },
            /**
             * Custom metadata from a file in the triggering GCS file's directory
             */
            directory?: {
                use?: boolean,
                fileName?: string
            }
        }
    },
    /**
     * User provided context
     */
    userContext?: any,
    /**
     * post-job-completion actions
     * TODO: revoir le systeme de post-actions
     */
    postActions?: {
        /**
         * Save job result to file's metadata
         * Note: Ignored if TriggerType is not 'Storage'
         */
        saveToMetadata?: {
            use?: boolean,
            prefix?: string
        }
        /**
         * Archive file
         * Note: Ignored if TriggerType is not 'Storage'
         */
        archive: {
            use?: boolean,
            bucket?: string,
            /**
             * Archive directory
             * Note: Ignored if TriggerType is not 'Storage' or archiveFile is false
             */
            directory?: string
        }
    }
}
