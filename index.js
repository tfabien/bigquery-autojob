// ######################################################
// Imports and init
// ######################################################
const {Storage} = require('@google-cloud/storage');
const {BigQuery} = require('@google-cloud/bigquery');
const path = require('path');
const extend = require('extend');
const dot = require('dot-object');
const mustache = require('mustache');
const getStream =  require('get-stream');

const storage = new Storage();
const bigquery = new BigQuery();

const mappingsDir = "mappings/"

// ######################################################
// Exported functions
// ######################################################

exports.loadFile = async (data, context) => {
    const file = data;
    console.log("Found new file: gs://" + file.bucket + "/" + file.name);
  
  	if (file.name.startsWith(mappingsDir)) {
    	console.log("File is located in mappings directory, ignoring...");
        return;
    }
  
    // Get job configuration from mappings (loading mapping configs from GCS)
    var jobConfiguration = getJobConfigurationFromMappings(await loadMappingsFromGCS(file.bucket), file);
  
    // Merge job configuration from file's metadata
    jobConfiguration = extend(true, jobConfiguration, await getJobConfigurationFromMetadata(file));

    // Loads data from file into the table
    console.log("Loading into table with following configuration:")
    console.log(dot.dot(jobConfiguration));
    bigquery.createJob({ configuration: jobConfiguration });
};

// ######################################################
// Helpers
// ######################################################

// Load mappings from GCS
var loadMappingsFromGCS = async (bucketName) => {
  var mappings = [];
  const [files] = await storage.bucket(bucketName).getFiles({ prefix: mappingsDir });
  for (i in files) {
    var file = files[i];
    console.log("Reading mapping file: " + file.name);
    var mappingRules = JSON.parse(await getStream(file.createReadStream()));
    console.log(mappingRules);
    mappings = mappings.concat(mappingRules);    
  }
  return mappings;
}

// Find matching configurations for file
var getJobConfigurationFromMappings = (mappings, file) => {
    var result = {};
    var mappingVariables = {};
    const filePath = "gs://" + file.bucket + "/" + file.name;

    console.log("Looking for configuration for filepath: " + filePath)

    // For each mapping configuration available
    for (i in mappings) {
        var mapping = dot.object(mappings[i]);
        // If mapping matches the filepath...
        var match = filePath.match(new RegExp(mapping.match));
        if (match) {
            console.log("Mapping '" + mapping.id + "' matches filepath, merging configuration...");
            // Add regex named groups to the available variables
            mappingVariables = extend(true, mappingVariables, match.groups);
            // Replace variables in mapping template
            var mappingConfiguration = dot.dot(mapping.configuration);
            for (j in mappingConfiguration) {
                mappingConfiguration[j] = mustache.render(mappingConfiguration[j], mappingVariables);
            }
            // Merge to the resulting configuration
            result = extend(true, result, dot.object(mappingConfiguration));
            console.log(dot.dot(result));
        }
    }
    return result;
}

// Read job configuration from metadata
var getJobConfigurationFromMetadata = async (file, prefix = 'bigquery') => {
    // Get file metadata
    var metadatas = await storage
        .bucket(file.bucket)
        .file(file.name)
        .getMetadata();
  	
  	// Extract options from metadata
    var result = {}
    metadatas.forEach((m) => {
      var metadata = m && m['metadata'] ? dot.object(m['metadata']) : {};
      metaOptions = metadata && metadata[prefix] ? metadata[prefix] : {};
      result = extend(true, result, metaOptions);
    });
    return result;
}