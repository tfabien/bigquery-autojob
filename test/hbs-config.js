const _ = require('lodash');
const glob = require('glob');

const Config = require('../hbs-config');

const context = {
    file: {
        bucket: 'mybucket',
        name: 'cities_20190507.csv'
    },
    env: {
        PROJECT_ID: 'myproject',
        DATASET_ID: 'Staging'
    }
};

const mappings = new Config('mappings');
_.each(glob.sync("./mappings/**/*.hbs"), function (file) {
    console.log(file);
    mappings.loadFile(file);
});

const result = mappings.compute(context);
console.log(JSON.stringify(result, null, 2));
