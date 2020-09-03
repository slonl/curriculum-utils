    const repl = require('repl');
    var curriculumLib = require('./lib/curriculum.js');

    var curriculum = curriculumLib.create();
    var masterCurriculum = curriculumLib.create();

    var contexts = [
    	'basis',
    	'lpib',
    	'kerndoelen',
    	'examenprogramma',
    	'examenprogramma-bg',
    	'syllabus',
    	'leerdoelenkaarten',
    	'doelgroepteksten'
    ];

    var schemaBaseURL  = 'https://opendata.slo.nl/curriculum/schemas/';

    var schemas = {};
    var schemaNames = {};
    contexts.forEach(function(context) {
        schemaNames[context] = 'curriculum-'+context+'/context.json';
        schemas[context] = curriculum.loadSchema('curriculum-'+context+'/context.json', 'curriculum-'+context+'/');
        masterCurriculum.loadSchema('master/curriculum-'+context+'/context.json','master/curriculum-'+context+'/');
    });

    var server = repl.start({
        ignoreUndefined: true
    });
    server.context.curriculum = curriculum;
    if (process.env.NODE_REPL_HISTORY) {
        server.setupHistory(process.env.NODE_REPL_HISTORY, (e) => { if (e) console.log(e); } );
    } else {
        console.log('Set environment variable NODE_REPL_HISTORY=.repl_history to enable persistent REPL history');
    }
