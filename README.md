# bigquery-autojob

# Documentation is deprecated, syncing up...

A Google Cloud Function providing a **simple and configurable** way to automatically load data  from GCS files into Big Query tables.

It features a **_convention over configuration_** approches, and provides a sensible default configuration for common file formats _(CSV, JSON, AVRO, ORC, Parquet)_
* The table name is automatically derived from the file's name, minus the extension, and date/timestamp suffix if any.
* Autodetect features enabled
* Avro logical types are used
* New data is appended to the table

If the default behaviour does not suit your needs, it can be modified for all or certain files through mapping files or custom metadata.

# Quickstart

* Create a new `bq-autoload` Google Cloud Storage bucket
  ```bash
  $> gsutil mb -c regional -l europe-west1 "gs://bq-autoload"
  ```

* Create a new `Staging` BigQuery dataset
  ```bash
  $> bq mk --dataset "Staging"
  ```
 
* Clone and deploy this repository as a cloud function triggered by changes on this GCS bucket _(**do not forget to replace the project id**)_
  ```bash
  $> git clone "https://github.com/tfabien/bigquery-autoload/"              \
     && cd "bigquery-autoload"                                              \
     && gcloud functions deploy "bigquery-autoload"                         \
                      --trigger-bucket "bq-autoload"                        \
                      --set-env-vars "PROJECT_ID={{YOUR_GCP_PROJECT_ID}}"   \
                      --runtime "nodejs10"                                  \
                      --memory "128MB"
  ```
  
That's it :+1:

Any file you upload to the `bq_autoload` GCS bucket will now automatically be loaded into a BigQuery table within seconds.
  
# Usage
See the [wiki](https://github.com/tfabien/bigquery-autoload/wiki) for usage samples and advanced configuration

