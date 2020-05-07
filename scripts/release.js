    var curriculum = require('lib/curriculum.js');

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
    });
    
