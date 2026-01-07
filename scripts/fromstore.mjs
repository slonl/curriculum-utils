import Curriculum from 'curriculum-js'
// load node filesystem support
import fs from 'fs'
import JSONTag from '@muze-nl/jsontag'
import parse from '@muze-nl/od-jsontag/src/parse.mjs'
import * as odJSONTag from '@muze-nl/od-jsontag/src/jsontag.mjs'

const config = {
	owner: 'slonl',
	branchName: 'editor',
	authToken: process.env.AUTH_TOKEN
}
const meta = {
	index: {
		id: new Map()
	}
}

function getUUID(url) {
	const u = new URL(url, 'https://localhost/')
	return u.pathname.split('/') // split path into filenames
		.filter(Boolean) // remove empty filenames, e.g. if url ends with '/' 
		.pop() // return last element
}

let toCamel = {}
function initConvertTable() {
	Object.keys(meta.schema.types).forEach(camelCase => {
		toCamel[meta.schema.types[camelCase].label+'_id'] = camelCase
	})
	Object.keys(meta.schema.properties).forEach(prop => {
		if (meta.schema.properties[prop]?.type=='object') {
			toCamel[meta.schema.types[prop].label+'_id'] = prop
		}
	})
}

const camelCase = (snake_case) => {
	return toCamel[snake_case]
}
const snake_case = (camelCase) => {
	return Object.entries(toCamel).filter(([snake,camel]) => camel=camelCase).pop()?.[0]
}

function toJSON(ob) {
	const type = odJSONTag.getAttribute(ob, 'class')
	if (!type) {
		console.log('no type',ob)
		process.exit()	
	}
	const id = getUUID(odJSONTag.getAttribute(ob, 'id'))
	let result = {
	}
	let props = ['deleted','dirty','replaces','replacedBy']
	let children = []
	if (meta.schema.types[type]?.properties) {
		props = props.concat(Object.keys(meta.schema.types[type]?.properties))
	}
	if (meta.schema.types[type]?.children) {
		children = Object.values(meta.schema.types[type].children).map(c => c.label+'_id')
	}

	const getChildren = (ob, camelCase, snake_case, force ) => {
		if (typeof result[snake_case] !== 'undefined') {
			return
		}
		if (ob[camelCase] && ob[camelCase].length) {
			result[snake_case] = ob[camelCase].map(child => {
				return getUUID(odJSONTag.getAttribute(child, 'id'))
			})
		} else if (typeof ob[camelCase] != 'undefined') {
			if (!force && typeof ob[camelCase] == 'string' && !ob[camelCase]) {
				return
			}
			if (!force && Array.isArray(ob[camelCase]) && !ob[camelCase].length) {
				return
			}
			result[snake_case] = ob[camelCase]
		}
	}

	const getProperty = (ob, property, force) => {
		if (typeof result[property] !== 'undefined') {
			return
		}
		if (property == 'id') {
			result.id = getUUID(odJSONTag.getAttribute(ob, 'id'))
		}
		if (property=='replaces' || property=='replacedBy') {
			if (typeof ob[property] != 'undefined') {
				result[property] = ob[property].map(e => getUUID(odJSONTag.getAttribute(e, 'id')))
			}
		} else if (typeof ob[property] != 'undefined') {
			if (!force && typeof ob[property] == 'string' && !ob[property]) {
				return
			}
			if (!force && Array.isArray(ob[property]) && !ob[property].length) {
				return
			}
			if (meta.schema.types[type].properties[property]?.type=='object') {
				let snake_property = meta.schema.types[property].label+'_id'
				console.log('property with type object',property, snake_property)
				result[snake_property] = getUUID(odJSONTag.getAttribute(ob[property], 'id'))
			} else {
				result[property] = ob[property]
			}
		}
	}

	const source = curriculum.index.id[id]
	if (source) {
		Object.keys(source).forEach(property => {
			let obProperty = property
			if (props.indexOf(property)!==-1) {
				getProperty(ob, property, true)
			} else if (children.indexOf(property)!==-1) {
				getChildren(ob, camelCase(property), property, true)
				obProperty = camelCase(property)
			}	
			if (typeof result[property] == 'undefined' && typeof ob[obProperty] !== 'undefined') {
				if (Array.isArray(ob[obProperty]) && ob[obProperty].length===0) {
					result[property] = []
				} else if (typeof ob[obProperty] == 'string' && !ob[obProperty]) {
					result[property] = ""
				}
			}
		})
	}
	// add missing properties
	props.forEach(property => {
		if (typeof result[property] == 'undefined') {
			getProperty(ob, property)
		}
	})
//	console.log(meta.schema.types[type])
	if (meta.schema.types[type]?.children) {
		Object.entries(meta.schema.types[type].children).forEach(([childType, childDef]) => {
			if (typeof result[childDef.label+'_id'] == 'undefined') {
				getChildren(ob, childType, childDef.label+'_id')
			}
		})
	}
	return result
}

function loadCommandStatus(commandStatusFile) {
    let status = []
    if (fs.existsSync(commandStatusFile)) {
        let file = fs.readFileSync(commandStatusFile, 'utf8')
        if (file) {
            let lines = file.split("\n").filter(Boolean) //filter clears empty lines
            for(let line of lines) {
                let command = JSONTag.parse(line)
                if (command.status=='done') {
	                status.push(command.command)
	            }
            }
        } else {
            console.error('Could not open command status',commandStatusFile)
        }
    } else {
        console.log('no command status', commandStatusFile)
    }
    return status
}

function loadDataJsontag(commandstatusfile, storepath) {	
	let count = 0
	let basefile = storepath
	let jsontag
	let data = {}
	let tempMeta = {}
	let status = loadCommandStatus(commandstatusfile)
	let datafile = basefile+'data.jsontag'
	let schemafile = basefile + 'schema.jsontag'
	let commandid
	do {
		console.log('reading',datafile)
		jsontag = fs.readFileSync(datafile, 'utf8')
		data = parse(jsontag, tempMeta, false) // tempMeta is needed to combine the resultArray, using meta conflicts with meta.index.id
		count++
		commandid = status.shift()
		datafile = basefile + 'data.' + commandid + '.jsontag'
	} while(fs.existsSync(datafile))
	meta.parts = count
	if (schemafile) {
		jsontag = fs.readFileSync(schemafile, 'utf8')
		meta.schema = JSONTag.parse(jsontag, null, tempMeta)
	}
	return data
}

const curriculum = new Curriculum()
const dataspace = loadDataJsontag(process.cwd()+'/store/command-status.jsontag', process.cwd()+'/store/')

function updateContexts() {
	console.log('updating all contexts')
	Object.values(meta.schema.contexts).forEach(context => {
		Object.keys(context).forEach(type => {
			if (type==='Deprecated' || type=='Alias' || type=='label') {
				return
			}
			if (!dataspace[type]) {
				console.log('missing dataspace['+type+']')
				return
			}
			const label = meta.schema.types[type].label
			console.log('reading',type,label)
			curriculum.data[label] = dataspace[type].map(toJSON)
			curriculum.schema[context.label][label] = curriculum.data[label]
		})
	})
}

async function exportFilesToGithub(repo, schema) {
	// use the sources.writeFile function for each type in schema

}

async function main() {
	const schemas = {}
	await Promise.all(Object.values(meta.schema.contexts).map(async context => {
		console.log('loading git',context.label)
		schemas[context.label] = await curriculum.loadContextFromFile(
			context.label, 
			'editor/curriculum-'+context.label+'/context.json',
		)
		console.log('schema loaded',context.label)
		return true
	}))
	initConvertTable()
	updateContexts()

	Object.values(meta.schema.contexts).forEach(context => {
		let schemaName = 'curriculum-'+context.label;
		console.log('writing',schemaName,context.label)
		curriculum.exportFiles(curriculum.schemas[context.label], context.label,
		'editor/'+schemaName+'/')
	})
	console.log("\nDone\n")
}

main()
