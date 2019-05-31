const _ = require('lodash');
const glob = require('glob');

const Config = require('../modules/hbs-config');

const context = {
    file: {
        bucket: 'mybucket',
        name: 'Staging/Cities of the World/cities_20190507.js'
        //name: 'cities_20190507.js'
    },
    env: {
        PROJECT_ID: 'myproject',
        DATASET_ID: 'Staging'
    }
};

const mappings = new Config();
_.each(glob.sync(__dirname + "/../test/mappings/**/*.hbs"), function (file) {
    console.log(file);
    mappings.loadFile(file);
});

const result = mappings.compute(context);
console.log(JSON.stringify(result, null, 2));
