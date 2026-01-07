// load the curriculum-js library
import Curriculum from 'curriculum-js'
// load node filesystem support
import fs from 'fs'

const snakeToCamel = str =>
  str.replace(/([-_][a-z])/g, group =>
    group
      .toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );

const capitalizeFirstLetter = str => 
  str[0].toUpperCase()+str.substring(1)

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

	let parsed = {}
	let storeSchema = {
		contexts: {},
		types: {},
		properties: {}
	}

	// wait untill all contexts have been loaded, and return the promise values as schemas
	Promise.allSettled(loadedSchemas).then((settledSchemas) => {
		loadedSchemas = settledSchemas.map(promise => promise.value)
	})
	.then(async () => {
	    return await Promise.allSettled(loadedSchemas.map(async schema => {
            let name = schema.$id.substring('https://opendata.slo.nl/curriculum/schemas/curriculum-'.length)
            name = name.substring(0, name.length - '/context.json'.length)
            parsed[name] = await curriculum.parseSchema(schema)

            let cName = name; //capitalizeFirstLetter(snakeToCamel(name))
console.log(cName)
            storeSchema.contexts[cName] = {
                label: name
            }
            let typeDef = {
                label: '',
                properties: {},
                children: {}
            }
            Object.keys(parsed[name].definitions).forEach(type => {
                if (['inhoud','uuid','uuidArray','baseid','base','allEntities'].indexOf(type)!=-1) {
                    return
                }
                let cType = type; //capitalizeFirstLetter(snakeToCamel(type))
                if (!storeSchema.types[cType]) {
                    storeSchema.types[cType] = JSON.parse(JSON.stringify(typeDef))
                }
                if (['Examenprogramma','Vakleergebied','LdkVakleergebied','Syllabus','FoDomein','RefVakleergebied','ErkGebied','ErkTaalprofiel',
                    'ExamenprogrammaBgProfiel','KerndoelVakleergebied','InhVakleergebied','NhCategorie','FoSet'].includes(cType)) {
                    storeSchema.types[cType].root = true
                }
                let cTypeDef = storeSchema.types[cType]
                cTypeDef.label = type
                Object.keys(parsed[name].definitions[type].properties).forEach(prop => {
                    if (prop.substring(prop.length-3)=='_id') {
                        prop = prop.substring(0, prop.length-3)
                        let CamelProp = prop; //capitalizeFirstLetter(snakeToCamel(prop))
                        if (!storeSchema.types[CamelProp]) {
                            storeSchema.types[CamelProp] = JSON.parse(JSON.stringify(typeDef))
                            storeSchema.types[CamelProp].label = prop
                        }
                        cTypeDef.children[CamelProp] = storeSchema.types[CamelProp]
						if (CamelProp=='Vakleergebied') {
							let vtype = parsed[name].definitions[type].properties.vakleergebied_id.type
							if (vtype!='array') {
								storeSchema.types[cType].properties.Vakleergebied = {
									type: "object"
								}
							}
						}
                    } else {
                        if (!storeSchema.properties[prop]) {
                            storeSchema.properties[prop] = parsed[name].definitions[type].properties[prop]
                            if (parsed[name].definitions[type].required?.includes(prop)) {
                                storeSchema.properties[prop].required = true
                            }
                            if (['replaces','replacedBy','unreleased','dirty','id'].indexOf(prop)!=-1) {
                                storeSchema.properties[prop].editable = false
                            }
                        }
                        cTypeDef.properties[prop] = storeSchema.properties[prop]
                    }
                })
                storeSchema.contexts[cName][cType] = cTypeDef
                storeSchema.types[cType] = cTypeDef
            })
            return true
        }))
    })
    .then(() => {
		// for all types
		Object.keys(storeSchema.types).forEach(type => {
			// read all entities
			if (type == 'deprecated' || type == 'tag') {
				return
			}
			console.log('checking '+type, curriculum.data[type]?.length)
			curriculum.data[type]?.forEach(entity => {
				// and test if all properties of each entity are in the schema
				Object.keys(entity).forEach(prop => {
					if (['replaces','replacedBy','deleted','dirty','unreleased'].includes(prop)) {
						return
					}
					if (entity[prop]==="") {
						return
					}
					if (prop.substr(-3)=='_id') {
						prop = prop.substring(0, prop.length-3)
						if (!storeSchema.types[type].children[prop]) {
							console.error(type+': '+entity.id+': unknown child '+prop)
						}
					} else if (!storeSchema.types[type].properties[prop]) {
						console.error(type+': '+entity.id+': unknown prop '+prop+': '+entity[prop])
					}
				})
			})
		})
	})
}

main()