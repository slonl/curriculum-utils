import Curriculum from 'curriculum-js'

async function release() {

    var editorCurriculum = new Curriculum()
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
        'inhoudslijnen',
	'niveauhierarchie'
    ];

    let loadedSchemas = schemas.map(
        schema => editorCurriculum.loadContextFromFile(
            'curriculum-'+schema, 
            './editor/curriculum-'+schema+'/context.json'
        )
    ).concat(schemas.map(
        schema => masterCurriculum.loadContextFromFile(
            'curriculum-'+schema, 
            './master/curriculum-'+schema+'/context.json'
        )
    ))

    Promise.allSettled(loadedSchemas).then((settledSchemas) => {
        loadedSchemas = settledSchemas.map(promise => promise.value)
    })
    .then(() => {

        function getClean(entityId) {
            return masterCurriculum.index.id[entityId];
        }

        // search for all deleted entities
        // and move them to deprecated
        // and remove them from all other entities
        // and mark those as dirty, unless unreleased
        Object.keys(editorCurriculum.index.id)
        .filter(function(entityId) {
            return parseInt(editorCurriculum.index.id[entityId].deleted)==1;
        }).map(function(entityId) {
            return editorCurriculum.index.id[entityId];
        }).forEach(function(entity) {
            delete entity.deleted;
            console.log('deleting '+entity.id);
            editorCurriculum.deprecate(entity);
        });

        // search for all dirty entities, that are not unreleased
        // get the last released version (rest api? master branch?)
        // put that version in deprecated
        // create new uuid for dirty entity, mark unreleased
        // search for all references to old uuid
        // replace those references
        // mark containing entity dirty (unless unreleased)
        var dirty;
        do {
            dirty = editorCurriculum.getDirty();
            dirty.forEach(function(entity) {
                var section      = editorCurriculum.index.type[entity.id];
                if (section === 'deprecated') {
                    // this entity has already been deprecated
                    return;
                }
                var schemaName   = editorCurriculum.index.schema[entity.id];
                var cleanVersion = getClean(entity.id);
                if (!cleanVersion) {
                    // entity marked as dirty, but isn't actually released, so ignore it, TODO: add warning?
                    console.log('entity '+entity.id+' marked dirty, but it is not released, skipping');
                    delete entity.dirty;
                    return;
                }
                var clone = editorCurriculum.clone(entity);
                clone.id  = editorCurriculum.uuid();
                delete clone.dirty;

                editorCurriculum.index.id[entity.id] = cleanVersion;
                editorCurriculum.add(schemaName, section, clone);
                console.log('replacing '+entity.id+' with '+clone.id);
                editorCurriculum.replace(entity.id, clone.id);
//                console.log('done replacing '+entity.id);
            });
        } while (dirty && dirty.length);
        // repeat untill no more dirty entities are found

        // search for all unreleased entities
        // remove unreleased
        console.log('Removing unreleased tag');
        Object.keys(editorCurriculum.index.id).filter(function(id) {
            return editorCurriculum.index.id[id].unreleased;
        }).forEach(function(id) {
            delete editorCurriculum.index.id[id].unreleased;
        });

        schemas.forEach(function(schema) {
            schema = 'curriculum-'+schema
            console.log('exporting '+schema);
            editorCurriculum.exportFiles(editorCurriculum.schemas[schema], schema, 'master/'+schema+'/');
        });
    })

}

release()