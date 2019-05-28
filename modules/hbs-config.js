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

// ---------------------
// Export
// ---------------------
module.exports = Config;

function Config() {
  this._init()
}

// ---------------------
// Private
// ---------------------

var _templates = [];

Config.prototype._init = function () {
  // Autoregister helpers
  const handlebarsDir = __dirname + '/../handlebars';
  handlebarsWax(handlebars)
    .helpers(handlebarsDir + '/helpers/**/*.js')
    .decorators(handlebarsDir + '/decorators/**/*.js')
    .partials(handlebarsDir + '/partials/**/*.js')
    .data(handlebarsDir + '/data/**/*.js');

  // Clear templates list
  this.clear();
}

// Render a template and parse result as json
Config.prototype._runTemplate = function (template, parameters) {
  const document = template(parameters);
  const json = hjson.parse(document);
  return dot.object(json);
}

// Register a template
Config.prototype._registerTemplate = function (document) {
  const template = handlebars.compile(document, { noEscape: true });
  this._templates.push(template);
}

// ---------------------
// Public
// ---------------------

// Clear templates list
Config.prototype.clear = function () {
  this._templates = [];
};

// Load a template (direct)
Config.prototype.load = function (...documents) {
  const that = this;
  _.each(documents, function (document) {
    that._registerTemplate(document);
  });
}

// Load a template (from file)
Config.prototype.loadFile = function (...filePaths) {
  for (const filePath of filePaths) {
    const document = fs.readFileSync(filePath, 'UTF-8');
    this.load(document);
  }
}

// Load a template (read from stream)
Config.prototype.loadStream = function (...streams) {
  const that = this;
  const loadStreamSync = async (streams) => {
    for (const stream of streams) {
      const document = await getStream(stream);
      that.load(document);
    }
  }
  loadStreamSync(streams);
};

// Render templates with parameters and merge json results
Config.prototype.compute = function (parameters) {
  const that = this;
  return _.reduce(this._templates, (result, template) => {
    const it = that._runTemplate(template, parameters);
    console.debug('Merging configuration:')
    console.debug(JSON.stringify(it, null, 2));
    console.debug('- - -')
    return extend(true, result, it);
  }, null);
};
