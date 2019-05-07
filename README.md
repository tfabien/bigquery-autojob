
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
  
* Clone this repository to your local  filesystem and upload the mapping files to the gcs bucket
  ```bash
  $> git clone "https://github.com/tfabien/bigquery-autoload/" && \
       cd "bigquery-autoload" && \
       gsutil cp -r "./mappings" "gs://bq-autoload/"
  ```
 
* Deploy as a cloud function triggered by changes on this GCS bucket _(**do not forget to replace the project id**)_
  ```bash
  $> gcloud functions deploy "bigquery-autoload" \
                      --trigger-bucket "bq-autoload" \
                      --set-env-vars "PROJECT_ID=REPLACE_WITH_YOUR_GCP_PROJECT_ID" \
                      --runtime "nodejs10" \
                      --memory "128MB"
  ```
  
# Sample usage

The [samples](samples) directory provides a quick overview of the different use cases

### Upload a CSV file to create a new table
The [samples/cities_20190506.csv](samples/cities_20190506.csv) file is CSV file, **separated with `,`**, and **with a header line**.
It has **127 records**.

> Upload the file to the `biquery-autoload` GCS bucket
> ```bash
> $> gsutil cp samples/cities_20190506.csv gs://bq-autoload
> ```

-> A new **`Staging.cities`** BigQuery table will automatically be created and populated with data from the CSV
* The column names are extracted from the header line
* The column types are infered from data

> ```bash
> $> bq query-q "SELECT * FROM Staging.cities LIMIT 5"
> +------+------+------+-------+------+------+------+----+-----------------+-------+
> | LatD | LatM | LatS |  NS   | LonD | LonM | LonS | EW |      City       | State |
> +------+------+------+-------+------+------+------+----+-----------------+-------+
> |   39 |   45 |    0 | false |   75 |   33 |    0 | W  | Wilmington      |  DE   |
> |   41 |   15 |    0 | false |   77 |    0 |    0 | W  | Williamsport    |  PA   |
> |   26 |   43 |   11 | false |   80 |    3 |    0 | W  | West Palm Beach |  FL   |
> |   36 |   40 |   11 | false |  121 |   39 |    0 | W  | Salinas         |  CA   |
> |   50 |   25 |   11 | false |  104 |   39 |    0 | W  | Regina          |  SA   |
> +------+------+------+-------+------+------+------+----+-----------------+-------+
> $> bq query -q --format json "SELECT COUNT(*) as Count FROM Staging.cities"
> [{"Count":"127"}]
> ```

### Upload a CSV file, adding data and a new column to the existing table
The [samples/cities_20190507.csv](samples/cities_20190507.csv) has the same structure as [samples/cities_20190506.csv](samples/cities_20190506.csv) with one ***additional `Comment` column***, and has **1 record**

Upload the file to the `biquery-autoload` GCS bucket

> ```bash
> $> gsutil cp samples/cities_20190507.csv gs://bq-autoload
> ```

-> The **`Staging.cities`** BigQuery table is updated:
* The `Comment` column has been created with a `String` infered type, and a `null`default value
* The new line from the [samples/cities_20190507.csv](samples/cities_20190507.csv) file has been added

> ```bash
> $> bq query-q "SELECT * FROM Staging.cities LIMIT 5"
> +------+------+------+-------+------+------+------+----+-----------------+-------+------------------------------------------------------+
> | LatD | LatM | LatS |  NS   | LonD | LonM | LonS | EW |      City       | State |                       Comment                        |
> +------+------+------+-------+------+------+------+----+-----------------+-------+------------------------------------------------------+
> |   41 |    5 |   59 | false |   80 |   39 |    0 | W  | Youngstown      |  OH   | This is a new line appended from cities_20190507.csv |
> |   39 |   45 |    0 | false |   75 |   33 |    0 | W  | Wilmington      |  DE   | NULL                                                 |
> |   41 |   15 |    0 | false |   77 |    0 |    0 | W  | Williamsport    |  PA   | NULL                                                 |
> |   26 |   43 |   11 | false |   80 |    3 |    0 | W  | West Palm Beach |  FL   | NULL                                                 |
> |   36 |   40 |   11 | false |  121 |   39 |    0 | W  | Salinas         |  CA   | NULL                                                 |
> +------+------+------+-------+------+------+------+----+-----------------+-------+------------------------------------------------------+
> $> bq query -q --format json "SELECT COUNT(*) as Count FROM Staging.cities"
> [{"Count":"128"}]
> ```

### Upload a CSV file, using custom metadata to specify an arbitrary table, and specify `TRUNCATE` mode to replace all existing data 
The [samples/export_cities.20190508.csv](samples/export_cities.20190508.csv) has the the same structure as [samples/cities_20190506.csv](samples/cities_20190506.csv) _(eg: no `Comment` column)_ and has **10 records**.

Uploading this file as is would normally cause a new `export_cities` table to be created.
We will upload this file with additional custom metadata to override this behaviour
> ```bash
> $> gsutil cp -h "x-goog-meta-bigquery.configuration.load.destinationTable.datasetId: Cities" \
>              -h "x-goog-meta-bigquery.configuration.load.writeDisposition: WRITE_TRUNCATE" \
>              samples/export_cities.20190508.csv gs://bq-autoload
> ```

-> The **`Staging.cities`** BigQuery table is updated:
* The `Comment` column has been deleted (due to the `WRITE_TRUNCATE`mode being used)
* All existing rows have been deleted, and the 10 records from the CSV file have been inserted

> ```bash
> $> bq query-q "SELECT * FROM Staging.cities LIMIT 5"
> +------+------+------+-------+------+------+------+----+-----------------+-------+
> | LatD | LatM | LatS |  NS   | LonD | LonM | LonS | EW |      City       | State |
> +------+------+------+-------+------+------+------+----+-----------------+-------+
> |   41 |    5 |   59 | false |   80 |   39 |    0 | W  | Youngstown      |  OH   |
> |   39 |   45 |    0 | false |   75 |   33 |    0 | W  | Wilmington      |  DE   |
> |   41 |   15 |    0 | false |   77 |    0 |    0 | W  | Williamsport    |  PA   |
> |   26 |   43 |   11 | false |   80 |    3 |    0 | W  | West Palm Beach |  FL   |
> |   36 |   40 |   11 | false |  121 |   39 |    0 | W  | Salinas         |  CA   |
> +------+------+------+-------+------+------+------+----+-----------------+-------+
> $> bq query -q --format json "SELECT COUNT(*) as Count FROM Staging.cities"
> [{"Count":"10"}]
> ```

### Upload a CSV file without header into a new table, configure columns names and types using a mappings file
The [samples/cities_noheader_20190506.csv](samples/cities_noheader_20190506.csv) has the the same structure as [samples/cities_20190506.csv](samples/cities_20190506.csv) but has no header line. It has 10 records.

Uploading this file as is would normally result into a new `cities_noheader` table being created with generic columns names like `{inferedType}_field_{n}`
> ```bash
> $> gsutil cp samples/cities_noheader_20190506.csv gs://bq-autoload
> $> bq query -q "SELECT * FROM Staging.cities_noheader LIMIT 1"
> +---------------+---------------+---------------+--------------+---------------+---------------+---------------+----------------+----------------+----------------+
> | int64_field_0 | int64_field_1 | int64_field_2 | bool_field_3 | int64_field_4 | int64_field_5 | int64_field_6 | string_field_7 | string_field_8 | string_field_9 |
> +---------------+---------------+---------------+--------------+---------------+---------------+---------------+----------------+----------------+----------------+
> |            39 |            45 |             0 |        false |            75 |            33 |             0 | W              | Wilmington     |  DE            |
> +---------------+---------------+---------------+--------------+---------------+---------------+---------------+----------------+----------------+----------------+
> ```

The [samples/mappings/cities_noheader_yyyyMMdd.json](samples/mappings/cities_noheader_yyyyMMdd.json) file defines a mapping matching the header-less CSV file name _(`/\/cities_noheader_\d{8}\.csv$/`)_ and specifies the column names and types to be used.

> ```js
> [
>   {
>     "id": "cities_noheader_yyyyMMdd",
>     "match": "\\/cities_noheader_\\d{8}\\.csv$",
>     "configuration.load.schema.fields[0].name": "LatD",
>     "configuration.load.schema.fields[0].type": "INTEGER",
>     "configuration.load.schema.fields[1].name": "LatM",
>     "configuration.load.schema.fields[1].type": "INTEGER",
>     "configuration.load.schema.fields[2].name": "LatS",
>     "configuration.load.schema.fields[2].type": "INTEGER",
>     "configuration.load.schema.fields[3].name": "NS",
>     "configuration.load.schema.fields[3].type": "BOOLEAN",
>     // ...
>   }
> ]
> ```

Uploading this mapping file to the `mappings` directory of the autoload GCS bucket will allow the Cloud Function to be parsed, and the configuration to be modified for all files matching the `cities_noheader_yyyyMMdd.csv` pattern.

Subsequent upload of the [samples/cities_noheader_20190506.csv](samples/cities_noheader_20190506.csv) file will yiled a different result

> ```bash
> $> gsutil cp samples/mappings/cities_noheader_yyyyMMdd.json gs://bq-autoload/mappings/cities_noheader_yyyyMMdd.json
> $> gsutil cp samples/cities_noheader_20190506.csv gs://bq-autoload
> ```

-> The **`Staging.cities_noheaders`** BigQuery table is created:
* The column names and types are extracted from the load job configuration

> ```bash
> $> bq query -q "SELECT * FROM Staging.cities_noheader LIMIT 1"
> +------+------+------+-------+------+------+------+----+----------+-------+
> | LatD | LatM | LatS |  NS   | LonD | LonM | LonS | EW |   City   | State |
> +------+------+------+-------+------+------+------+----+----------+-------+
> |   49 |   52 |   48 | false |   97 |    9 |    0 | W  | Winnipeg |  MB   |
> +------+------+------+-------+------+------+------+----+----------+-------+
> ```

### Declare a new `*.unl` file format _(pipe-delimited file format)_
--TODO--

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
   * @see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs#configuration.load for the list of available options
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
