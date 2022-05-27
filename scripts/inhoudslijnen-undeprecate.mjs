/**
 * This script solves a problem in the curriculum-inhoudslijnen context
 * This context was incorrectly skipped in the 2021-1 release
 * Which means that it had references to curriculum-basis doelniveau entities
 * that were deprecated.
 * This script loops through all non-deprecated entities in this context and checks each
 * reference in each entity to see if it is deprecated.
 * If so, it uses the replacedBy values to update the reference.
 * After a manual check there were no references that could not be updated like this, all
 * references had a single replacedBy value.
 * So there is no need for more complex code.
 */

// load the curriculum-js library
import Curriculum from 'curriculum-js'
// load node filesystem support
import fs from 'fs'

// create an async function, so we can use await inside it
async function main() {

	// create new curriculum instance
	const curriculum = new Curriculum()

	// find the newest id (or ids) that replace the given id
	function timetravel(id) {
		let entity = curriculum.index.deprecated[id]
		if (!entity) {
			if (curriculum.index.id[id]) {
				return [id]
			} else {
				return []
			}
		}
		if (entity.replacedBy) {
			return entity.replacedBy.flatMap(rId => timetravel(rId))
		}
		return []
	}

	// replaces oldId with newId, curriculum.replace fails, because oldId
	// is already deprecated
	function replace(entity, prop, oldId, newId) {
		if (Array.isArray(entity[prop])) {
			entity[prop] = entity[prop].filter(id => id!==oldId)
			if (newId) {
				entity[prop] = entity[prop].concat(newId)
			}
		} else {
			entity[prop] = newId
		}
		if (!entity.unreleased) {
			entity.dirty = true;
		}
	}

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

		// for all datasets in inhoudslijnen:
		Object.keys(curriculum.schema['curriculum-inhoudslijnen']).forEach(dataset => {
			// that isn't deprecated
			if (dataset==='deprecated') {
				return
			}

			// for all entities in each dataset 
			curriculum.data[dataset].forEach(entity => {
				// for all properties in each entity
				Object.keys(entity).forEach(entityProp => {
					// that end in '_id'
					if (entityProp.substring(entityProp.length-3)==='_id') {
						// and are arrays
						if (Array.isArray(entity[entityProp])) {
							// check each id in that array
							entity[entityProp].forEach(refId => {
								// if it is deprecated
								if (curriculum.index.deprecated[refId]) {
									let newIds = timetravel(refId)
									if (!newIds.length) {
										console.log('deprecated ref '+refId+' missing in '+entity.id+' ('+curriculum.index.type[entity.id]+')')
									} else {
										console.log('deprecated ref '+refId+' replacedBy '+JSON.stringify(newIds))
										newIds.forEach(newId => replace(entity, entityProp, refId, newId))
									}
								}
							})
						} else {
							let refId = entity[entityProp]
							if (curriculum.index.deprecated[refId]) {
								let newIds = timetravel(refId)
								if (!newIds.length) {
									console.log('deprecated ref '+refId+' missing in '+entity.id+' ('+curriculum.index.type[entity.id]+')')
								} else {
									console.log('deprecated ref '+refId+' replacedBy '+JSON.stringify(newIds))
									newIds.forEach(newId => replace(entity, entityProp, refId, newId))
								}
							}
						}
					}
				})
			})

			// then write the data back
			curriculum.exportFiles(curriculum.schemas['curriculum-inhoudslijnen'], 'curriculum-inhoudslijnen', './editor/curriculum-inhoudslijnen/')
		})
	})
}

main()