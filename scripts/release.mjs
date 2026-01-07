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

        // mark curriculum-samenhang tags all as unreleased so that
        // they won't ever get new uuid's
        for (let t of editorCurriculum.schema['curriculum-samenhang'].tag) {
            t.unreleased = true
        }
        for (let t of editorCurriculum.data.tag) {
            t.unreleased = true
        }

        // for (let section of ['fo_set','fo_doelzin','fo_uitwerking','fo_illustratie']) {
        //     for (let entity of editorCurriculum.data[section]) {
        //         if (!entity.status) {
        //             console.log('fixing status for ', entity.id)
        //             entity.status = 'concept'; // TODO remove in the future
        //         }                
        //     }
        // }

        // search for all deleted entities
        // and move them to deprecated
        // and remove them from all other entities
        // and mark those as dirty, unless unreleased
        Object.keys(editorCurriculum.index.id)
        .filter(function(entityId) {
            return parseInt(editorCurriculum.index.id[entityId].deleted)==1 
                || editorCurriculum.index.id[entityId].deleted===true;
        }).map(function(entityId) {
            return editorCurriculum.index.id[entityId];
        }).forEach(function(entity) {
            delete entity.deleted;
            if (editorCurriculum.index.type[entity.id]!='niveau') {
                // never delete niveaus in a release, use a separate script
                // because it is almost never the right thing to do
                //TODO: add a check that there are no active entities (not deprecated) still linking to 
                // a .deleted entity. If so, require extra command line param --allow-active-delete
                // otherwise skip this delete, add it to a list
                // and show that list after this run and exit the release script
                console.log('deleting '+entity.id);
                // @FIXME: double check that entity is not dirty, if so get the clean entity, deprecate the clean entity
                editorCurriculum.deprecate(entity); 
            }
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
                // if (section === 'vakleergebied') { // temporary fix to not create new uuids for vakleergebied
                //     delete entity.dirty
                //     return
                // }
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