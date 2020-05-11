    var Ajv = require('ajv');
    var ajv = new Ajv({
        'extendRefs': true,
        'allErrors': true,
        'jsonPointers': true
    });
    var validate = null;

    ajv.addKeyword('itemTypeReference', {
        validate: function(schema, data, parentSchema, dataPath, parentData, propertyName, rootData) {
            var matches = /.*\#\/definitions\/(.*)/g.exec(schema);
            if (matches) {
                var result = curriculum.index.type[data] == matches[1];
                return result;
            }
            console.log('Unknown #ref definition: '+schema);
        }
    });

    var curriculumLib = require('../scripts/lib/curriculum.js');
    var curriculum = curriculumLib.create();
    
    var contexts = [
    	'doelen',
    	'inhouden',
    	'kerndoelen',
    	'examenprogramma',
    	'examenprogramma-bg',
    	'syllabus',
    	'leerdoelenkaarten',
    	'doelgroepteksten'
    ];

    var schemaBaseURL  = 'https://opendata.slo.nl/curriculum/schemas/';

    var schemas = {};
    contexts.forEach(function(context) {
    	schemas[context] = curriculum.loadSchema('curriculum-'+context+'/context.json', 'curriculum-'+context+'/');
    	ajv.addSchema(schemas[context], schemaBaseURL + 'curriculum-'+context+'/context.json');
    });
    
    var errors = {};
    var valid = true;
    contexts.forEach(function(context) {
    	valid = ajv.validate(schemaBaseURL + 'curriculum-' + context + '/context.json', curriculum.data);
    	if (!valid) {
            errors[context] = ajv.errors;
        }
    });

    var valid = true;
    Object.keys(errors).forEach(function(context) {
    	valid = false;
        errors[context].forEach(function(error) {
            console.log(error.dataPath+': '+error.message);
        });
    });
    if (!valid) {
        console.log('data is invalid');
        process.exit(1);
    } else {
        console.log('data is valid!');
    }
