import _ from 'lodash';
import handlebars from 'handlebars';
import handlebarsWax from 'handlebars-wax';
import handlebarsHelpers from 'handlebars-helpers';
import getStream from "get-stream";
import { readFileSync } from 'fs';
import { Stream } from 'stream';
import { Template } from './template';

export default class HBSConfig {

    private templates: Array<Template>;

    constructor() {
        // Register 'handlebars-helpers' helpers
        handlebarsHelpers()

        // Register local helpers
        const handlebarsDir = __dirname + '/handlebars';
        handlebarsWax(handlebars)
            .helpers(handlebarsDir + '/helpers/**/*.js')
            .decorators(handlebarsDir + '/decorators/**/*.js')
            .partials(handlebarsDir + '/partials/**/*.js')
            .data(handlebarsDir + '/data/**/*.js');

        // Clear templates list
        this.clear();
    }

    /**
     * Clear templates list
     */
    public clear(): void {
        this.templates = [];
    }

    /**
     * Load a template
     * 
     * @param name 
     * @param source 
     */
    public load(name: string, source: string): void {
        console.debug('Loading ' + name);
        this.registerTemplate(name, source);
    }

    /**
     * Load a template (from file)
     * 
     * @param filePath 
     */
    public loadFile(filePath: string): void {
        const source = readFileSync(filePath, 'UTF-8')
        this.load(filePath, source);
    }

    /**
     * Load a template (from stream)
     * 
     * @param filePath 
     */
    public async loadStream(name: string, stream: Stream): Promise<void> {
        return getStream(stream).then((source) => this.load(name, source));
    }

    public apply(context): Promise<any> {
        return _.chain(this.templates)
            .map(template => template.run(context))
            .filter(it => !_.isEmpty(it))
            .reduce(_.merge)
            .value();
    }

    /**
     * Register a template
     * 
     * @param name 
     * @param source 
     */
    private registerTemplate(name: string, source: string): void {
        const fn = handlebars.compile(source, {
            noEscape: true
        });
        const template: Template = new Template({
            name: name,
            source: source,
            fn: fn
        });
        this.templates.push(template);
    }
}
