    var curriculum = require('lib/curriculum.js');
    var masterCurriculum = require('lib/curriculum.js');

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
    contexts.forEach(function(context) {
        schemas[context] = curriculum.loadSchema('curriculum-'+context+'/context.json', 'curriculum-'+context+'/');
        masterCurriculum.loadSchema('master/curriculum-'+context+'/context.json','master/curriculum-'+context+'/');
    });

    function getClean(entityId) {
        return masterCurriculum.index.id(entityId);
    }

    // search for all deleted entities
    // and move them to deprecated
    // and remove them from all other entities
    // and mark those as dirty, unless unreleased
    curriculum.index.ids.filter(function(entity) {
        return !!entity.deleted;
    }).forEach(function(entity) {
        delete entity.deleted;
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
    while (dirty = curriculum.getDirty()) {
        dirty.forEach(function(entity) {
            var section      = curriculum.index.type[entity.id];
            var schemaName   = curriculum.index.schema[entity.id];
            var cleanVersion = getClean(entity.id);
            var clone        = curriculum.clone(entity);
            clone.id = curriculum.uuid();
            delete clone.dirty;

            curriculum.index.id[entity.id] = cleanVersion;
            curriculum.add(schemaName, section, clone);

            curriculum.replace(entity.id, clone.id);
        });
    }
    // repeat untill no more dirty entities are found

    // search for all unreleased entities
    // remove unreleased
    Object.keys(curriculum.index.id).filter(function(id) {
        return curriculum.index.id[id].unreleased;
    }).forEach(function(id) {
        delete curriculum.index.id[id].unreleased;
    });

    contexts.forEach(function(context) {
        curriculum.exportFiles(schemas[context], 'curriculum-'+context+'/');
    });
