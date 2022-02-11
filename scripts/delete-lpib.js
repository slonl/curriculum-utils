var curriculumLib = require('./lib/curriculum.js');

var curriculum = curriculumLib.create();

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
    schemas[context]     = curriculum.loadSchema('curriculum-'+context+'/context.json', 'curriculum-'+context+'/');
});

var countByType = {
	lpib_vakleergebied: 0,
	lpib_leerlijn: 0,
	lpib_vakkencluster: 0,
	lpib_vakkern: 0,
	lpib_vaksubkern: 0,
	lpib_vakinhoud: 0,
	doelniveau: 0,
	doel: 0
}

var toBeDeleted = [];

Object.keys(schemas.lpib.properties).forEach(prop => {
	if (prop!='deprecated') {
		curriculum.data[prop].forEach(e => {
			toBeDeleted.push(e);
			countByType[prop]++;
		})
	}
})

var dnErrorCount = 0;
var seen = {}

toBeDeleted.forEach(e => {
	if (e.doelniveau_id) {
		e.doelniveau_id.forEach(dnId => {
			if (seen[dnId]) {
				return;
			}
			seen[dnId] = true;

			let dn = curriculum.index.id[dnId];
			if (!dn) {
				dnErrorCount++;
				//console.error('dn '+dnId+' not found, referenced in '+e.id);
			} else {
				//FIXME: check that doelniveau isn't referenced by other entities, which aren't deleted or deprecated
				// or do this in a seperate stage after this on
				toBeDeleted.push(dn);
				countByType.doelniveau++;
				if (dn.doel_id) {
					dn.doel_id.forEach(doelId => {
						if (seen[doelId]) {
							return
						}
						seen[doelId] = true;
						let doel = curriculum.index.id[doelId];
						if (!doel) {
							//console.error('doel '+doelId+' not found, referenced in '+dn.id);
						} else {
							//FIXME: add the same check as for doelniveau references here as well
							toBeDeleted.push(doel);
							countByType.doel++;
						}
					})
				}
			}
		})
	}
})

// set deleted=1 on all toBeDeleted
toBeDeleted.forEach(e => e.deleted=1)

// now check that all toBeDeleted entities have no references other than entities that are also deleted or deprecated
let refCount = 0;
seen = {};

let skipList = {};

toBeDeleted.forEach(e => {
	let refs = curriculum.index.references[e.id];
	if (!refs) {
		return;
	}
	refs.forEach(ref => {
		if (curriculum.index.type[ref] == 'deprecated') {
			return;
		}
		let refEnt = curriculum.index.id[ref];
		if (refEnt && !refEnt.deleted) {
			if (!curriculum.index.references[ref]) {
				toBeDeleted.push(refEnt);
			} else {
				let allRefsDeprecated = true;
				curriculum.index.references[ref].forEach(id => {
					if (curriculum.index.type[id]!=='deprecated') {
						allRefsDeprecated = false;
					}
				})
				if (!seen[ref] && !allRefsDeprecated) {
					seen[ref]=1;
					refCount++;
					console.log(e.id+' still has a link from '+ref+' ('+curriculum.index.type[ref]+')')
					skipList[e.id]=true;
				}
			}
		}
	})
})

toBeDeleted.forEach(e => {
	if (!skipList[e.id]) {
		e.deleted = 1;
	}
});

console.log(refCount+' entities found with still relevant references');
console.log((toBeDeleted.length-refCount)+' entities to be deleted');
console.log(dnErrorCount+' missing doelniveaus');
console.log(countByType)
console.log(refCount+' lingering references');

['lpib','basis'].forEach(function(context) {
    console.log('exporting '+context+' to curriculum-'+context+'/');
    curriculum.exportFiles(schemas[context], schemaNames[context], 'curriculum-'+context+'/');
});
