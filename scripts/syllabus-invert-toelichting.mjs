/**
 */

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

		// for all specifieke eindtermen:
		curriculum.data.syllabus_toelichting.forEach(entity => {
			// check if there is a syllabus_specifieke_eindterm_id
			if (Array.isArray(entity.syllabus_specifieke_eindterm_id)) {
				// for each reference, fetch the referenced entity
				entity.syllabus_specifieke_eindterm_id.forEach(eindtermId => {
					let eindterm = curriculum.index.id[eindtermId]
					// if eindterm has no syllabus_toelichting_id yet, create it
					if (typeof eindterm.syllabus_toelichting_id === 'undefined') {
						eindterm.syllabus_toelichting_id = []
					}
					eindterm.syllabus_toelichting_id.push(entity.id)
					if (!eindterm.unreleased) {
						eindterm.dirty = true
					}
				})
				delete entity.syllabus_specifieke_eindterm_id
				if (!entity.unreleased) {
					entity.dirty = true
				}
			}
		})

		// then write the data back
		curriculum.exportFiles(curriculum.schemas['curriculum-syllabus'], 'curriculum-syllabus', './editor/curriculum-syllabus/')
	})
}

main()