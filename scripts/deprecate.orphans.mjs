// load the curriculum-js library
import Curriculum from 'curriculum-js'
// load node filesystem support
import fs from 'fs'

// create an async function, so we can use await inside it
async function main() {

	// create new curriculum instance
	const curriculum = new Curriculum()

	// read the list of all contexts from the file /curriculum-contexts.txt
	const schemas = fs.readFileSync('curriculum-contexts.txt','utf8')
        .split(/\n/g)             // split the file on newlines
        .map(line => line.trim()) // remove leading and trailing whitespace
        .filter(Boolean)          // filter empty lines
        
	// load all contexts from the editor/ folder
	let loadedSchemas = schemas.map(
		schema => curriculum.loadContextFromFile(schema, './editor/'+schema+'/context.json')
	)

	// wait untill all contexts have been loaded, and return the promise values as schemas
	Promise.allSettled(loadedSchemas).then((settledSchemas) => {
		loadedSchemas = settledSchemas.map(promise => promise.value)
	})
	.then(() => {
/*
		let deprDoel = JSON.parse(fs.readFileSync('./scripts/deprecate.doel.json','utf8'))
		let deprDoelniveau = JSON.parse(fs.readFileSync('./scripts/deprecate.doelniveau.json','utf8'))
		for (let doelID of deprDoel) {
			if (curriculum.index.type[doelID]!='doel') {
				throw new Error(doelID+' is not a doel');
			}
			let doel = curriculum.index.id[doelID]
			curriculum.deprecate(doel)
		}
		for (let dnID of deprDoelniveau) {
			if (curriculum.index.type[dnID]!='doelniveau') {
				throw new Error(dnID+' is not a doelniveau');
			}
			let dn = curriculum.index.id[dnID]
			curriculum.deprecate(dn)
		}
*/
		let orphans = JSON.parse(fs.readFileSync('./scripts/orphans.json','utf8'))
		console.log('deleting',orphans.length)
		let counter = 0
		for (let oID of orphans) {
			let o = curriculum.index.id[oID]
			counter++
			o.deleted = true
		}
		console.log('counted',counter)


		schemas.forEach(function(schema) {
			console.log('exporting '+schema);
			curriculum.exportFiles(curriculum.schemas[schema], schema, 'editor/'+schema+'/');
		});
	})
}

main()