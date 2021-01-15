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

// find all entities without references in the editor branch -> orphans
var orphans = [];
Object.keys(curriculum.index.id).forEach(id => {
	if (!curriculum.index.references[id]) {
		orphans.push(id);
	}
});
/*
curriculum.data.doelniveau.forEach(e => {
	if (!curriculum.index.references[e.id]) {
		orphans.push(e.id);
	}
});
*/

// for all orphans in the editor branch, find orphans that do have references in the master branch
// these have been orphaned in the editor branch in later changes
masterOrphans = [];
orphans.forEach(id => {
	if (masterCurriculum.index.references[id]) {
		masterOrphans.push(id);
	}
});

// now filter these orphans and only keep those that had references from the leerdoelenkaarten context
// this leaves only doelniveau's that are referenced from leerdoelenkaarten
// and tags from same
// doelen are only ever referenced from doelniveau's so these shouldn't be in here
ldkOrphans = [];
masterOrphans.forEach(id => {
	var refs = masterCurriculum.index.references[id];
	var ldk = false;
	refs.forEach(refid => {
		if (masterCurriculum.index.schema[refid]=='master/curriculum-leerdoelenkaarten/context.json') {
			ldk = true;
		}
	});
	if (ldk) {
		ldkOrphans.push(id);
	}
});

console.log(orphans.length, masterOrphans.length, ldkOrphans.length);
var beforeDn = curriculum.schema['curriculum-basis/context.json'].doelniveau.length;
var beforeDoel = curriculum.schema['curriculum-basis/context.json'].doel.length;
console.log('before',beforeDn, beforeDoel);

var affectedSchemas = new Set();
var affectedTypes = new Set();
var originalDnData = curriculum.schema['curriculum-basis/context.json'].doelniveau.map(e => e.id);

// now remove the leerdoelenkaarten orphans from the schema data
// this doesn't remove doelen, only tags and doelniveau's
var referencedDoelen = new Set();
ldkOrphans.forEach(id => {
	var schemaName = curriculum.index.schema[id];
	var section = curriculum.index.type[id];
	if (schemaName && section) {
		if (curriculum.index.id[id].doel_id) {
			curriculum.index.id[id].doel_id.forEach(did => { referencedDoelen.add(did); });
		}
		affectedTypes.add(section);
		affectedSchemas.add(schemaName);
		curriculum.schema[schemaName][section] = curriculum.schema[schemaName][section].filter(function(e) {
			return e.id != id;
		});
	}
});

console.log('referencedDoelen',[...referencedDoelen].length);
// now remove the doelen that were referenced by these removed doelniveau's
var ldkDoelOrphans = [];
var dnData = curriculum.schema['curriculum-basis/context.json'].doelniveau;
[...referencedDoelen].forEach(doel_id => {
	var refs = curriculum.index.references[doel_id];
	if (Array.isArray(refs)) {
		// only filter out doelen that were referenced in doelniveau originally but no longer
		refs = refs.filter(refid => {
			return (dnData.includes(refid) || !originalDnData.includes(refid));
		});
	}
	if (!refs || !refs.length) {
		ldkDoelOrphans.push(doel_id);
	}
});

ldkDoelOrphans.forEach(id => {
	var schemaName = curriculum.index.schema[id];
	var section = curriculum.index.type[id];
	if (schemaName && section) {
		affectedTypes.add(section);
		affectedSchemas.add(schemaName);
		curriculum.schema[schemaName][section] = curriculum.schema[schemaName][section].filter(function(e) {
			return e.id != id;
		});
	}
});

console.log(affectedSchemas, affectedTypes);
var afterDn = curriculum.schema['curriculum-basis/context.json'].doelniveau.length;
var afterDoel = curriculum.schema['curriculum-basis/context.json'].doel.length;
console.log('after',afterDn, afterDoel);
var diffDn = beforeDn - afterDn;
var diffDoel = beforeDoel - afterDoel;
console.log('diff',diffDn, diffDoel);

var schemaShortName = 'basis';
var schemaName = schemaNames[schemaShortName];
var schema = schemas[schemaShortName];
curriculum.exportFiles(schema, schemaName, 'curriculum-'+schemaShortName+'/');
