
# bigquery-autoload
**_Auto-load files from Google Cloud Storage to Google BigQuery tables_**

A Google Cloud Function providing a **simple and configurable** way to automatically load data  from GCS files into Big Query tables.

It features a **_convention over configuration_** approches, and provides a sensible default configuration for common file formats _(CSV, JSON, AVRO, ORC, Parquet)_
* The table name is automatically derived from the file's name, minus the extension, and date/timestamp suffix if any.
* CSV and JSON files are loaded with autodetect feature enabled
* Avro logical types are used
* New data is appended to the table
* ...

If the default behaviour does not suit your needs, it can be modified for all or certain files through mapping files or custom metadata.

# Quickstart
### First-time configuration
* Create a new `bq-autoload` Google Cloud Storage bucket
  ```bash
  $> gsutil mb -c regional -l europe-west1 "gs://bq-autoload"
  ```
 
* Clone and deploy this repository as a cloud function triggered by changes on this GCS bucket _(**do not forget to replace the project id**)_
  ```bash
  $> git clone "https://github.com/tfabien/bigquery-autoload/"                     \
     && cd "bigquery-autoload"                                                     \
     && gcloud functions deploy "bigquery-autoload"                                \
                      --trigger-bucket "bq-autoload"                               \
                      --set-env-vars "PROJECT_ID=REPLACE_WITH_YOUR_GCP_PROJECT_ID" \
                      --runtime "nodejs10"                                         \
                      --memory "128MB"
  ```
  
That's it :+1:

Any file you upload to the `bq_autoload` GCS bucket will now automatically be loaded into a BigQuery table within seconds.
  
# Sample usage
See the (wiki)[wiki] for usage samples

# Changing and overriding default behaviour

When fired, the Cloud Function creates a BigQuery load job for the triggering file.

This job will be auto-configured with sensible default options, but you can alter these options using:
* Environment variables
* Custom metadata on the file
* Mapping files

[The complete list of available configuration options is available at https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs#configuration.load](https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs#configuration.load)

## Environment variables
These **environment variables** can be set during the deployment to override the default bahaviour without editing mappings:
* **`PROJECT_ID`**: GCP Project ID _(any `String`, **mandatory**, no default value)_
* **`DATASET_ID`**: Default dataset for the destination table _(any `String`, defaults to `"Staging"`)_
* **`CREATE_DISPOSITION`**: Should new tables be automatically created _(`CREATE_IF_NEEDED|CREATE_NEVER`, defaults to `CREATE_IF_NEEDED`)_
* **`WRITE_DISPOSITION`**: How new data for an existing table should be processed _(`WRITE_TRUNCATE|WRITE_APPEND|WRITE_EMPTY`, defaults to `WRITE_APPEND`)_
* **`ENCODING`**: Encoding of the file _(`UTF-8|ISO-8859-1`, defaults to `UTF-8`)_

## Custom metadata
Any custom metadata prefixed with `bigquery.` will be added to the `load` job configuration
Any option specified in custom metadata will take precedence and override existing configuration options if present

>**Example:**
> Changing the table name and dataset by setting custom metadata at upload time
> *Note: Custom metadata keys must be prefixed with `x-goog-meta-` when using gsutil to upload the file*
>```bash
>  gsutil -h "x-goog-meta-bigquery.configuration.load.destinationTable.datasetId: Test" \
>         -h "x-goog-meta-bigquery.configuration.load.destinationTable.tableId: City" \
>         cp "samples/cities_20190506.csv" "gs://bq-autoload/"
>```

## Mapping files

### Mapping file structure
A mapping file is a list of mapping configurations.

A mapping configuration is defined as follows:
```js
{
  /**
   *A unique id identifying the mapping configuration
  **/
  "id": "_unique_id_",
  
  /**
   * A Regex pattern.
   * If this expression matches the filepath, this mapping configuration will be active.
   * Multiple mapping configuration can match a single file, all active maping configuration will be merged to determine the resulting effective configuration.
   * If (named) capturing groups are defined in the expression, they will be available for usage in configuration value templating
  **/
  "match": "gs:\/\/.+\/MyFile\.csv" //,
  
  /**
   * Any number of configuration options for the load job
   * This are the options that will be merged into the effective job configuration if this mapping is active
   * @see https://cloud.google.com/bigquery/docs/reference/rest/v2/JobConfiguration#JobConfigurationLoad for the list of available options
  **/
  "configuration.load.destinationTable.tableId": "MyTable",
  "configuration.load.writeDisposition":"WRITE_TRUNCATE"
}
```
### Adding a new mapping file
All files of the autoload bucket matching the _(glob)_ pattern **`/mappings/**/*.json`** will be aggregated to obtain the full mapping configuration

Therefore, you can add any number of arbitrary JSON files to the `/mappings/` directory, defining the mappings you want to use.
These mappings can be specific to a single file, or a file pattern matching multiple similar files you want to process the same way.

[Mustache](https://mustache.github.io/) templating engine is used for the `String` values of the configuration.
Named capturing groups are available as variables for replacement inside the values of the configuration options under the `groups` prefix.
Environment variables are available under the `env`prefix.

>**Example:**
> The following file will instruct biquery-autoloader to load data from `export_{table}_{yyyyMMdd}.csv` into the `{table}` table, and use truncate data dwrite disposition at load rather than append. 
> 
> _eg: `/export_cities_20190506.csv` will be loaded into the `cities` table_
>```bash
>$> cat /mappings/export_TABLE_yyyyMMdd.json
>```
>```json
>[
>   {
>      "id": "export_{table}_{yyyyMMdd}.csv",
>      "match": "\\/export_(?<TABLE>.*)_\\d{8}\\.csv$",
>      "configuration.load.destinationTable.tableId": "{{{groups.TABLE}}}",
>      "configuration.load.writeDisposition":"WRITE_TRUNCATE"
>   }
>]
>```
  
> **Example:**
> Use the first subdirectory as `datasetId`, and the second one as `tableId`, ignoring the file name
> The `gs://bq-autoload/Public/Cities/export_cities_2019-05-06.csv` will be loaded into the `Public.Cities` table
> ```json
> {
>   "id": "_table_naming",
>   "match": "^gs\\:\\/\\/[^\\/]+(?<DATASET_ID>\\/[^\\/]+)\\/(?<TABLE_ID>[^\\/]+)\\/.*$",
>   "configuration.load.destinationTable.datasetId": "{{{groups.DATASET_ID}}}",
>   "configuration.load.destinationTable.tableId": "{{{groups.TABLE_ID}}}"
>}
>```

## Default mappings reference
The `mapping/000_default_mappings.json` file defines the default configuration for the BigQuery `load` job
You can edit this file prior to deployment to modify or add default behaviour.

The following sections describe the default configuration shipped with this CLoud Function

#### "_global_config"
```json
{
   "id": "_global_config",
   "match": ".*",
   "configuration.load.destinationTable.projectId":"{{{env.PROJECT_ID}}}",
   "configuration.load.destinationTable.datasetId":"{{{env.DATASET_ID}}}{{^env.DATASET_ID}}Staging{{/env.DATASET_ID}}",
   "configuration.load.createDisposition":"{{{env.CREATE_DISPOSITION}}}{{^env.CREATE_DISPOSITION}}CREATE_IF_NEEDED{{/env.CREATE_DISPOSITION}}",
   "configuration.load.writeDisposition":"{{{env.WRITE_DISPOSITION}}}{{^env.WRITE_DISPOSITION}}WRITE_APPEND{{/env.WRITE_DISPOSITION}}",
   "configuration.load.encoding":"{{{env.ENCODING}}}{{^env.ENCODING}}UTF-8{{/env.ENCODING}}",
   "configuration.load.schemaUpdateOptions[0]": "ALLOW_FIELD_ADDITION",
	 "configuration.load.schemaUpdateOptions[1]": "ALLOW_FIELD_RELAXATION"
}
```
This configuration always applies and defines the global configuration options such as project id, dataset id, and write disposition

#### "_source_uri"
```json
{
  "id": "_source_uri",
  "match": "(?<FILE_URI>.*)",
  "configuration.load.sourceUris[0]":"{{{groups.FILE_URI}}}"
}
```
This configuration always applies and defines the source uri for the load job.

#### "_table_naming"
```json
{
   "id":"_table_naming",
   "match":"^gs\\:\\/\\/(?<FILE_BUCKET>[^\\/]+)(?:\\/(?<FILE_SUBDIR>.*))?\\/(?<FILE_NAME>.*?)(?:_(?<FILE_DATE>[\\d\\-\\_]+)*)?(?:\\.(?<FILE_EXTENSION>.*))?$",
   "configuration.load.destinationTable.tableId":"{{{groups.FILE_NAME}}}"
}
```
This configuration applies to all files and defines the table naming pattern for this file.

The table name is derived from the file name minus it's extension and optionnal `yyyyMMdd-HHmmSS` timestamp suffix, using named cature groups inside the regular expression.

> **Example:**
> All the following files will be loaded inside the same **`cities`** table:
> - `gs://bq-autoload/cities.csv`
> - `gs://bq-autoload/cities.json`
> - `gs://bq-autoload/cities_20190506.csv`
> - `gs://bq-autoload/cities_20190506-063000.csv`

You can change the `configuration.load.destinationTable.tableId`property to alter this naming convention if the provided default does not suite your needs.
Depending on the variables you want to use, you may also need to alter the `match` property to add new capturing groups.

### `_format_{csv|json|avro|...}`
Load options for the CSV file format:
```json
{
   "id":"_format_csv",
   "match":".+\\.csv$",
   "configuration.load.sourceFormat":"CSV",
   "configuration.load.autodetect":"True"
}
``` 

Load options for the JSON file format:
```json
{
    "id":"_format_json",
    "match":".+\\.js(?:on)?$",
    "configuration.load.sourceFormat":"NEWLINE_DELIMITED_JSON",
    "configuration.load.autodetect":"True"
}
```

Load options for the AVRO file format:
```json
{
   "id":"_format_avro",
   "match":".+\\.avro$",
   "configuration.load.sourceFormat":"AVRO",
   "configuration.load.useAvroLogicalTypes":"True"
}
```
