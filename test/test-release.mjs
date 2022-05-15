import Curriculum from 'curriculum-js'

async function validate() {

	var masterCurriculum = new Curriculum()
	var schemas = [
		'basis',
		'kerndoelen',
		'examenprogramma',
		'examenprogramma-bg',
		'syllabus',
		'leerdoelenkaarten',
		'doelgroepteksten',
		'erk',
		'inhoudslijnen'
	]

	let loadedSchemas = schemas.map(
		schema => masterCurriculum.loadContextFromFile(
			'curriculum-'+schema, 
			'./master/curriculum-'+schema+'/context.json'
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