import handlebars from 'handlebars';
import hjson from 'hjson';
import dot from 'dot-object';

export class Template {
    name: string;
    source: string;
    fn: handlebars.TemplateDelegate<any>;
    public constructor(init?: Partial<Template>) {
        Object.assign(this, init);
    }
    run(context: any) {
        const result = this.fn(context);
        try {
            const jsonResult = hjson.parse(result);
            return dot.object(jsonResult);
        }
        catch (e) {
            console.error('Error while parsing HJSON document: %s', result);
            throw e;
        }
    }
}
