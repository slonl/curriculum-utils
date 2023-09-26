import Curriculum from 'curriculum-js'
import fs from 'fs'

async function validate() {

	var masterCurriculum = new Curriculum()
    // read the list of all contexts from the file /curriculum-contexts.txt
    const schemas = fs.readFileSync('curriculum-contexts.txt','utf8')
        .split(/\n/g)             // split the file on newlines
        .map(line => line.trim()) // remove leading and trailing whitespace
        .filter(Boolean)          // filter empty lines


/*	var schemas = [
		'basis',
		'kerndoelen',
		'examenprogramma',
		'examenprogramma-bg',
		'syllabus',
		'leerdoelenkaarten',
		'doelgroepteksten',
		'erk',
		'inhoudslijnen',
		'referentiekader'
	]
*/

	let loadedSchemas = schemas.map(
		schema => masterCurriculum.loadContextFromFile(
			schema, 
			'./release/'+schema+'/context.json'
		)
	)

	Promise.allSettled(loadedSchemas).then((settledSchemas) => {
		loadedSchemas = settledSchemas.map(promise => promise.value)
	})
	.then(() => {

		schemas.forEach(async (schema, index) => {
			try {
				let result = await masterCurriculum.validate(loadedSchemas[index])
				console.log(schema+': Data is valid!')
			} catch(error) {
				if (error.validationErrors && Array.isArray(error.validationErrors)) {
					error.validationErrors.forEach(error => {
						console.log(schema+': '+error.instancePath+': '+error.message)
					})
				} else {
					console.log(schema, error.validationErrors)
				}
			}
		})
	})
}

validate()