import Curriculum from 'curriculum-js'
import fs from 'fs'

async function validate() {

	const editorCurriculum = new Curriculum()
	var schemas = fs.readFileSync('curriculum-contexts.txt','utf8').split(/\n/g)

	var loadedSchemas = schemas.map(
		schema => editorCurriculum.loadContextFromFile(
			schema, 
			'./editor/'+schema+'/context.json'
		)
	)

	Promise.allSettled(loadedSchemas).then((settledSchemas) => {
		loadedSchemas = settledSchemas.map(promise => promise.value)
	})
	.then(() => {

		schemas.forEach(async (schema, index) => {
			try {
				var result = await editorCurriculum.validate(loadedSchemas[index], true)
			} catch(error) {
				if (error.validationErrors && Array.isArray(error.validationErrors)) {
					error.validationErrors.forEach(error => {
						console.log(schema+': '+error.instancePath+': '+error.message)
					})
				} else {
					console.error(error.message)
				}
			}
		})
	})
}

validate()