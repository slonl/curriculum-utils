"use strict";
var curriculum = module.exports = {};

	curriculum.data    = {};
	curriculum.index   = {
		id: {},
		type: {},
		schema: {}
	};
	curriculum.schemas = [];
	curriculum.schema  = {};
	
	curriculum.uuid = function() {
		const uuidv4 = require('uuid/v4');
		return uuidv4();
	}
	
	curriculum.add = function(schemaName, section, object) 
	{
		if (!object.id) {
			object.id = curriculum.uuid();
		}
//		console.log('add: '+object.id+' in '+section);
//		console.log(JSON.stringify(object));
		object.unreleased = true;
		curriculum.data[section].push(object);
		curriculum.schema[schemaName][scetion].push(object);
		curriculum.index.id[object.id] = object;
		curriculum.index.type[object.id] = section;
		curriculum.index.schema[object.id] = schemaName;
		return object.id;
	}

	curriculum.deprecate = function(entity, replacedBy) {
		var currentSection = curriculum.index.type[entity.id];
		if (!currentSection) {
			throw new Error('entity '+entity.id+' is not part of any schema');
		}

		if (entity.unreleased) {
			// just remove it
			delete curriculum.index.id[entity.id];
			delete curriculum.index.type[entity.id];
			delete curriculum.index.schema[entity.id];
		} else {
			curriculum.replace(entity.id, replacedBy);
		}
	}

	curriculum.update = function(section, id, diff)
	{
		const uuidv4 = require('uuid/v4');
		const jsondiffpatch = require('jsondiffpatch');
//		console.log('update: '+id);
//		console.log(JSON.stringify(diff));
		var entity = curriculum.index.id[id];
		var clone  = curriculum.clone(entity);
		jsondiffpatch.patch(clone, diff);
		// check if entity must be deprecated
		// if so check that clone.id is not entity.id
		// if so create a new id for clone
		if (typeof entity.unreleased == 'undefined' || !entity.unreleased) {
			if (section=='deprecated') {
				// updating a deprecated entity, so only the replacedBy may be updated
				if (Object.keys(diff).length>1 || typeof diff.replacedBy == 'undefined') {
					throw new Error('illegal deprecated entity update '+id+': '+JSON.stringify(diff));
				}
			}
			if (clone.id == entity.id) {
				clone.id = uuidv4();
			}
			curriculum.add(section, clone);
			curriculum.replace(entity.id, clone.id);
		} else {
			// no need to deprecate entity, just update its contents
			if (clone.id!=entity.id) {
				throw new Error('update cannot change entity id');
			}
			entity = jsondiffpatch.patch(entity, diff);
		}
		return entity.id;
	}

	/**
	 * Replace an entity with a new entity
	 * Find all links to the old entity and replace the links
	 * add replacedBy in old entity
	 * add replaces in new entity
	 */
	curriculum.replace = function(id, newId) 
	{
		var section    = curriculum.index.type[id];
		var schemaName = curriculum.index.schema[entity.id];
		if (!Array.isArray(curriculum.schema[schemaName][section])) {
			throw new Error(section+' is not part of schema '+schemaName);
		}
		var newObject  = curriculum.index.id[newId];
		var oldObject  = curriculum.index.id[id];

		if (!oldObject.unreleased) {
			if (!newObject.replaces) {
				newObject.replaces = [];
			}
			newObject.replaces.push(id);
			
			if (!oldObject.replacedBy) {
				oldObject.replacedBy = [];
			}
			oldObject.replacedBy = oldObject.replacedBy.push(newId);
		}
		
		if (!oldObject.types) {
			oldObject.types = [];
		}
		oldObject.types.push(section);

		// remove item from current section
		var index = curriculum.data[section].findIndex(function(e) {
			return e.id == entity.id;
		});
		if (index<0) {
			throw new Error('could not find entity '+entity.id+' in section '+section);
		}
		curriculum.data[section].splice(index, 1);

		var index = curriculum.schema[schemaName][section].findIndex(function(e) {
			return e.id == entity.id;
		});
		curriculum.schema[schemaName][section].splice(index, 1);

		if (!oldObject.unreleased) {
			if (curriculum.index.type[oldObject.id]!='deprecated') {
				curriculum.data.deprecated.push(oldObject);
				curriculum.schema[schemaName].deprecated.push(oldObject);
				curriculum.index.type[oldObject.id] = 'deprecated';
			}
		}

		var parentSections = curriculum.getParentSections(section);
		var parentProperty = curriculum.getParentProperty(section);
//		console.log('replacing links for '+section+' '+id, parentSections);
		if (parentSections.length) {
			parentSections.forEach(function(parentSection) {
				curriculum.replaceLinks(parentSection, parentProperty, id, newId);
			});
//			console.log('replacing links done for '+section+' '+id);
		} else {
//			console.log('skipped replacing links');
		}
	}

	curriculum.replaceLinks = function(section, property, id, newId)
	{
		if (section) {
			curriculum.data[section].filter(
				function(entity) 
				{
					return entity[property] 
						&& entity[property].indexOf(id)!=-1;
				}
			).forEach(
				function(entity) 
				{
//					console.log('replacing links in '+entity.id+' '+property+' from '+id+' to '+newId);
					var index = entity[property].indexOf(id);
					if (!entity.unreleased) {
						entity.dirty = true;
					}
					if (newId) {
						entity[property].splice(index, 1, newId);
					} else {
						entity[property].splice(index, 1);
					}
				}
			);
		}
	}

	curriculum.getParentSections = function(section) 
	{
		var parentSections = [];
		var parentProperty = curriculum.getParentProperty(section);
		curriculum.schemas.forEach(function(schema) {
			Object.keys(schema.definitions).forEach(
				function(schemaSection) 
				{
					if (typeof schema.definitions[schemaSection].properties != 'undefined' 
						&& typeof schema.definitions[schemaSection].properties[parentProperty] != 'undefined'
					) {
						parentSections.push(schemaSection);
					}
				}
			);
		});
		return parentSections;
	}

	curriculum.getParentProperty = function(section) 
	{
		return section+'_id';
	}

	curriculum.loadSchema = function(schemaName, dir='') {
		var fs = require('fs');
		var context = fs.readFileSync(schemaName,'utf-8')
		var schema = JSON.parse(context);
		curriculum.schemas.push(schema);
		curriculum.schema[schemaName] = {};
		var properties = Object.keys(schema.properties);
		properties.forEach(function(propertyName) {
			if (typeof schema.properties[propertyName]['#file'] != 'undefined') {
				var file = schema.properties[propertyName]['#file'];
				var fileData = fs.readFileSync(dir+file, 'utf-8');
				console.log(propertyName+': reading '+dir+file);
				curriculum.data[propertyName] = JSON.parse(fileData);
				curriculum.schema[schemaName][propertyName] = curriculum.data[propertyName];				
				if (typeof curriculum.data[propertyName] == 'undefined') {
					console.log(propertyName+' not parsed correctly');
				} else if (typeof curriculum.data[propertyName].length == 'undefined') {
					console.log(propertyName+' has no length');
				} else {
					console.log(curriculum.data[propertyName].length + ' items found');
				}
				curriculum.data[propertyName].forEach(function(entity) {
					if (entity.id) {
						if (curriculum.index.id[entity.id]) {
							console.log('Duplicate id in '+propertyName+': '+entity.id,
								curriculum.index.id[entity.id], entity);
						} else {
							curriculum.index.id[entity.id] = entity;
							curriculum.index.type[entity.id] = propertyName;
							curriculum.index.schema[entity.id] = schemaName;
						}
						if (typeof entity.unreleased == 'undefined') {
							// Object.freeze(entity);
						}
					}
				});
			} else {
				console.log('skipping '+propertyName);
			}
		});
		return schema;
	}

	curriculum.exportFiles = function(schema, dir='')
	{
		var fs = require('fs');
		var properties = Object.keys(schema.properties);
		properties.forEach(function(propertyName) {
			if (typeof schema.properties[propertyName]['#file'] != 'undefined') {
				var file = schema.properties[propertyName]['#file'];
				var fileData = JSON.stringify(curriculum.schema[name][propertyName], null, "\t");
				fs.writeFileSync(dir+file, fileData);
			}
		});
	}

	curriculum.clone = function(object)
	{
		return JSON.parse(JSON.stringify(object));
	}

	curriculum.getDirty = function()
	{
		var dirty = [];
		Object.keys(curriculum.index.id).forEach(function(id) {
			if (curriculum.index.id[id].dirty && !curriculum.index.id[id].unreleased) {
				dirty.push(curriculum.index.id[id]);
			}
		});
		return dirty;
	}
	