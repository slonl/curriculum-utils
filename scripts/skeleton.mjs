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
			Insert your code here.
			If you want to do something for each loaded context, try this:

				schemas.forEach(schemaName => {
					curriculum.schema[schemaName]... // contains all properties e.g. curriculum.schema['curriculum-basis'].doel 
				})

			If you just want to work with the data, use

				curriculum.data.... // e.g. curriculum.data.doel

			If you want to check all entities, us

				Object.values(curriculum.index.id).forEach(entity => {
					// iterates of all non-deprecated entities
				})
		 */
	})
}

main()