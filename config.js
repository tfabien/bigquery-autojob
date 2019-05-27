// Utils
const _ = require('lodash');
const extend = require('extend');

// File handling
const fs = require('fs');
const getStream = require('get-stream');

// JSON-like format and helpers
const hjson = require('hjson');
const dot = require('dot-object');

// Templating
const handlebars = require('handlebars');
const handlebarsHelpers = require('handlebars-helpers')();
const handlebarsWax = require('handlebars-wax');

const state = {
  templates: []
};

const init = function () {
  // Autoregister helpers
  handlebarsWax(handlebars)
    .helpers('./handlebars/helpers/**/*.js')
    .decorators('./handlebars/decorators/**/*.js')
    .partials('./handlebars/partials/**/*.js')
    .data('./handlebars/data/**/*.js');

  // Clear templates list
  clear();
}

// Clear templates list
const clear = function () {
  state.templates = [];
}

// Load a template (direct)F
const load = function (...documents) {
  _.each(documents, function (document) {
    addTemplate(document);
  });
}

// Load a template (from file)
const loadFile = function (...filePaths) {
  for (const filePath of filePaths) {
    const document = fs.readFileSync(filePath, 'UTF-8');
    load(document);
  }
}

// Load a template (read from stream)
const loadStream = async function (...streams) {
  for (const stream of streams) {
    const document = await getStream(stream);
    load(document);
  }
}

// Register a template
const addTemplate = function (document) {
  const template = handlebars.compile(document, { noEscape: true });
  state.templates.push(template);
}

// Render templates with parameters and merge json results
const compute = function (parameters) {
  const globalConfiguration = {};
  _.each(state.templates, (template) => {
    const configuration = runTemplate(template, parameters);
    extend(true, globalConfiguration, configuration);
  })
  return globalConfiguration
}

// Render a template and parse result as json
const runTemplate = function (template, parameters) {
  const document = template(parameters);
  const json = hjson.parse(document);
  return dot.object(json);
}

init();

module.exports = function () {
  return {
    'load': load,
    'loadStream': loadStream,
    'loadFile': loadFile,
    'compute': compute
  }
}

