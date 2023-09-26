import Curriculum from 'curriculum-js'
// load node filesystem support
import fs from 'fs'

async function release() {

    // create new curriculum instances
    const editorCurriculum = new Curriculum()
    const masterCurriculum = new Curriculum()

    // read the list of all contexts from the file /curriculum-contexts.txt
    const schemas = fs.readFileSync('curriculum-contexts.txt','utf8')
        .split(/\n/g)             // split the file on newlines
        .map(line => line.trim()) // remove leading and trailing whitespace
        .filter(Boolean)          // filter empty lines

    // load all contexts from the editor/ and master/ folders
    let loadedSchemas = schemas.map(
        schema => editorCurriculum.loadContextFromFile(schema, './editor/'+schema+'/context.json')
    ).concat(schemas.map(
        schema => masterCurriculum.loadContextFromFile(schema, './master/'+schema+'/context.json')
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
            // @FIXME: double check that entity is not dirty, if so get the clean entity, deprecate the clean entity
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
                delete entity.dirty; // this entity will be deprecated, so no longer dirty after now

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
            console.log('exporting '+schema);
            editorCurriculum.exportFiles(editorCurriculum.schemas[schema], schema, 'release/'+schema+'/');
        });
    })

}

release()