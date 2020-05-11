    var curriculumLib = require('./lib/curriculum.js');

    var curriculum = curriculumLib.create();
    var masterCurriculum = curriculumLib.create();

    var contexts = [
    	'doelen',
    	'inhouden',
    	'kerndoelen',
    	'examenprogramma',
    	'examenprogramma-bg',
    	'syllabus',
    	'leerdoelenkaarten',
    	'doelgroepteksten'
    ];

    var schemaBaseURL  = 'https://opendata.slo.nl/curriculum/schemas/';

    var schemas = {};
    var schemaNames = {};
    contexts.forEach(function(context) {
        schemaNames[context] = 'curriculum-'+context+'/context.json';
        schemas[context] = curriculum.loadSchema('curriculum-'+context+'/context.json', 'curriculum-'+context+'/');
        masterCurriculum.loadSchema('master/curriculum-'+context+'/context.json','master/curriculum-'+context+'/');
    });

    function getClean(entityId) {
        return masterCurriculum.index.id[entityId];
    }

    // search for all deleted entities
    // and move them to deprecated
    // and remove them from all other entities
    // and mark those as dirty, unless unreleased
    Object.keys(curriculum.index.id)
    .filter(function(entityId) {
        return parseInt(curriculum.index.id[entityId].deleted)==1;
    }).map(function(entityId) {
        return curriculum.index.id[entityId];
    }).forEach(function(entity) {
        delete entity.deleted;
        console.log('deleting '+entity.id);
        curriculum.deprecate(entity);
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
        dirty = curriculum.getDirty();
        dirty.forEach(function(entity) {
            var section      = curriculum.index.type[entity.id];
            var schemaName   = curriculum.index.schema[entity.id];
            var cleanVersion = getClean(entity.id);
            if (!cleanVersion) {
                // entity marked as dirty, but isn't actually released, so ignore it, TODO: add warning?
                console.log('entity '+entity.id+' marked dirty, but it is not released, skipping');
                delete entity.dirty;
                return;
            }
            var clone        = curriculum.clone(entity);
            clone.id = curriculum.uuid();
            delete clone.dirty;

            curriculum.index.id[entity.id] = cleanVersion;
            curriculum.add(schemaName, section, clone);
            console.log('replacing '+entity.id+' with '+clone.id);
            curriculum.replace(entity.id, clone.id);
            console.log('done replacing '+entity.id);
        });
    } while (dirty && dirty.length);
    // repeat untill no more dirty entities are found

    // search for all unreleased entities
    // remove unreleased
    console.log('Removing unreleased tag');
    Object.keys(curriculum.index.id).filter(function(id) {
        return curriculum.index.id[id].unreleased;
    }).forEach(function(id) {
        delete curriculum.index.id[id].unreleased;
    });

    contexts.forEach(function(context) {
        console.log('exporting '+context+' to curriculum-'+context+'/');
        curriculum.exportFiles(schemas[context], schemaNames[context], 'release/curriculum-'+context+'/');
    });
