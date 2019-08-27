import _ from 'lodash'
import dot from 'dot-object'
import micromatch from 'micromatch'
import path from 'path';
import { Storage, StorageOptions, Bucket, File, MoveResponse, SetFileMetadataResponse, GetFilesOptions } from '@google-cloud/storage'
import { readFileSync } from 'fs';
import getStream from 'get-stream';

export default class GCSBucket {
    private bucket: Bucket;

    constructor(bucketName: string, storageOptions?: StorageOptions) {
        this.bucket = new Storage(storageOptions).bucket(bucketName);
    }

    /**
     * List bucket's files
     */
    public async list(globPattern = "**/*", options?: GetFilesOptions): Promise<Array<File>> {
        const [files] = await this.bucket.getFiles(options);
        const matcher = micromatch.matcher(globPattern, {});
        return _.filter(files, file => matcher(file.name));
    }

    /**
     * Read bucket's files
     */
    public async read(filePath: string): Promise<String> {
        const file: File = this.bucket.file(filePath);
        return getStream(file.createReadStream());
    }

     /**
     * Read bucket's files
     */
    public async exists(filePath: string): Promise<boolean> {
        const file: File = this.bucket.file(filePath);
        return file.exists().then((r) => r[0])
    }

    /** 
     * Archive a file in archives directory
     */
    public async archive(filePath: string, archiveDir: string): Promise<MoveResponse> {
        let fileName = path.basename(filePath);
        const fileExists = await this.bucket.file(filePath).exists();
        if (fileExists) {
            const newfileName = fileName + '.' + _.now();
            console.warn(fileName + ' already exists, renaming to ' + newfileName);
            fileName = newfileName;
        }
        return this.bucket.file(filePath).move(archiveDir + '/' + fileName);
    }

    /**
     * Get file's custom metadatas
     */
    public async getCustomMetadata(filePath: string): Promise<Map<string, object>> {
        let [metadatas] = await this.bucket.file(filePath).getMetadata();
        metadatas = _.get(metadatas, 'metadata');
        if (!metadatas) { return null }
        dot.object(metadatas);
        return metadatas;
    }

    /**
     * Set file's custom metadatas
     */
    public async setCustomMetadata(filePath: string, customMetadata: Map<string, object>): Promise<SetFileMetadataResponse> {
        return this.bucket.file(filePath).setMetadata({ metadata: customMetadata });
    }
}