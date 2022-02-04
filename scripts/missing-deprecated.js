var curriculumLib = require('./lib/curriculum.js');

var curriculum = curriculumLib.create();
var master     = curriculumLib.create();

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
var masterSchemas = {};
contexts.forEach(function(context) {
    schemaNames[context] = 'curriculum-'+context+'/context.json';
    schemas[context]     = curriculum.loadSchema('curriculum-'+context+'/context.json', 'curriculum-'+context+'/');
	masterSchemas[context] = master.loadSchema('master/curriculum-'+context+'/context.json', 'master/curriculum-'+context+'/');
});

var missing = []
var deprecated = []
Object.keys(curriculum.index.references).forEach(ref => {
	if (!curriculum.index.id[ref]) {
		missing.push(ref)
	} else if (curriculum.index.deprecated[ref]) {
		var nondeprecatedLinks = curriculum.index.references[ref].filter(id => !curriculum.index.deprecated[id])
		if (nondeprecatedLinks.length) {
			deprecated.push(ref)
		}
	}
})

missing.forEach(id => {
	if (!master.index.id[id]) {
		console.log('No data for '+id+', referenced by', curriculum.index.references[id]);
		curriculum.index.references[id].forEach(ref => {
			if (curriculum.index.id[ref]) {
				console.log('ref: '+ref+': '+curriculum.index.type[ref]+': '+curriculum.index.id[ref].title);
			} else {
				console.error('ref '+ref+' not found????')
			}
		})
	} else {
		console.log(id+': '+master.index.type[id]+': '+master.index.id[id].title);
	}
})

deprecated.forEach(id => {
	if (curriculum.index.references[id]) {
		let nondeprecatedLinks = curriculum.index.references[id]
			.filter(ref => !curriculum.index.deprecated[ref])
			.map(ref => ref+' ('+curriculum.index.type[ref]+': '+curriculum.index.id[ref].title + ')')
		console.log('Link to deprecated '+id+' ('+curriculum.index.type[id]+': '+curriculum.index.id[id].title+') found in ', nondeprecatedLinks)
	}
})

console.log('deprecated link count', deprecated.length)


