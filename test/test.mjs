import Curriculum from 'curriculum-js'

async function validate() {

	var editorCurriculum = new Curriculum()
	var schemas = [
		'basis',
		'kerndoelen',
		'examenprogramma',
		'examenprogramma-bg',
		'syllabus',
		'leerdoelenkaarten',
		'erk',
		'inhoudslijnen'
	]

	let loadedSchemas = schemas.map(
		schema => editorCurriculum.loadContextFromFile(
			'curriculum-'+schema, 
			'./editor/curriculum-'+schema+'/context.json'
		)
	)

	Promise.allSettled(loadedSchemas).then((settledSchemas) => {
		loadedSchemas = settledSchemas.map(promise => promise.value)
	})
	.then(() => {

		schemas.forEach(async (schema, index) => {
			try {
				let result = await editorCurriculum.validate(loadedSchemas[index])
				console.log(schema+': Data is valid!')
			} catch(error) {
				if (error.validationErrors && Array.isArray(error.validationErrors)) {
					error.validationErrors.forEach(error => {
						console.log(schema+': '+error.instancePath+': '+error.message)
					})
				} else {
					console.log(error.validationErrors)
				}
			}
		})
	})
}

validate()