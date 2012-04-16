var jsdoc = {name: require('jsdoc/name') };

test('There is a jsdoc/name module.', function() {
    assert.equal(typeof jsdoc.name, 'object');
});

test('The jsdoc/name module exports an shorten function.', function() {
    assert.equal(typeof jsdoc.name.shorten, 'function');
});

test('The module:jsdoc/name.shorten function breaks a longname up into the correct memberof, name and scope parts.', function() {
    var startName = 'lib.Panel#open',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, 'open', 'The name should be the bit after the last scoping character.');
    assert.equal(parts.memberof, 'lib.Panel', 'The memberof should be the bit before the last scoping character.');
    assert.equal(parts.scope, '#', 'The scope should be the scoping character itself.');
});

test('The module:jsdoc/name.shorten function works on static names.', function() {
    var startName = 'elements.selected.getVisible',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, 'getVisible');
    assert.equal(parts.memberof, 'elements.selected');
    assert.equal(parts.scope, '.');
});

test('The module:jsdoc/name.shorten function works on protoyped names.', function() {
    var startName = 'Validator.prototype.$element',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, '$element');
    assert.equal(parts.memberof, 'Validator');
    assert.equal(parts.scope, '#');
});

test('The module:jsdoc/name.shorten function works on inner names.', function() {
    var startName = 'Button~_onclick',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, '_onclick');
    assert.equal(parts.memberof, 'Button');
    assert.equal(parts.scope, '~');
});

test('The module:jsdoc/name.shorten function works on global names.', function() {
    var startName = 'close',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, 'close');
    assert.equal(parts.memberof, '', 'The memberof should be an empty string for global symbols.');
    assert.equal(parts.scope, '', 'The scope should be an empty string for global symbols.');
});

test('The module:jsdoc/name.shorten function works on bracketed stringy names.', function() {
    var startName = 'channels["#ops"]#open',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, 'open');
    assert.equal(parts.memberof, 'channels."#ops"', 'Bracketed stringy names should appear as quoted strings.');
    assert.equal(parts.scope, '#');

    startName = 'channels["#bots"]["log.max"]',
    parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, '"log.max"');
    assert.equal(parts.memberof, 'channels."#bots"');
    assert.equal(parts.scope, '.');
});

test('The module:jsdoc/name.shorten function works on fully stringy names, like "foo.bar".', function() {
    var startName = '"foo.bar"',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.name, '"foo.bar"', 'The name should be the full quoted string.');
    assert.equal(parts.longname, '"foo.bar"', 'The longname should be the full quoted string.');
    assert.equal(parts.memberof, '', 'There should be no memberof, as it is global.');
    assert.equal(parts.scope, '', 'The scope should be as global.');
});

test('The jsdoc/name module exports an applyNamespace function.', function() {
    assert.equal(typeof jsdoc.name.applyNamespace, 'function');
});

test('The module:jsdoc/name.applyNamespace function inserts the namespace in the correct place.', function() {
    var startName = 'lib.Panel#open',
        endName = jsdoc.name.applyNamespace(startName, 'event');
    
    assert.equal(endName, 'lib.Panel#event:open', 'The namespace should be inserted only before the name part of the longname.');
    
    startName = 'maths/bigint';
    endName = jsdoc.name.applyNamespace(startName, 'module');
    
    assert.equal(endName, 'module:maths/bigint', 'The namespace should be inserted before a global name.');
});

test('The module:jsdoc/name.applyNamespace function treats quoted parts of the name as atomic.', function() {
    var startName = 'foo."*dont\'t.look~in#here!"',
    endName = jsdoc.name.applyNamespace(startName, 'event');
    
    assert.equal(endName, 'foo.event:"*dont\'t.look~in#here!"', 'The namespace should be inserted before a quoted shortname.');
});

test('The module:jsdoc/name.applyNamespace function will not add another namespace if one already exists.', function() {
    var startName = 'lib.Panel#event:open',
        endName = jsdoc.name.applyNamespace(startName, 'event');
    
    assert.equal(endName, 'lib.Panel#event:open', 'The namespace should not be inserted twice.');
});

test('The module:jsdoc/name.shorten function finds the variation.', function() {
    var startName = 'anim.fadein(2)',
        parts = jsdoc.name.shorten(startName);
    
    assert.equal(parts.variation, '2');
    assert.equal(parts.name, 'fadein');
    assert.equal(parts.longname, 'anim.fadein(2)');
});

test('The module:jsdoc/name.splitName function finds the name and description.', function() {
    var startName = 'ns.Page#"last \\"sentence\\"".words~sort(2)   - This is a description. ',
        parts = jsdoc.name.splitName(startName);
    
    assert.equal(parts.name, 'ns.Page#"last \\"sentence\\"".words~sort(2)');
    assert.equal(parts.description, 'This is a description.');
});