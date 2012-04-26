(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/objectlit.js'),
        found = docSet.getByLongname('tools.serialiser.value');
    
    test('When a child of an objlit has no @name or @memberof tags.', function() {
        assert.equal(found.length, 1, 'A doclet with the correct longname should be found.');
        assert.equal(found[0].name,     'value', 'The short name should be correct.');
        assert.equal(found[0].memberof, 'tools.serialiser', 'The memberof should be correct.');
        assert.equal(found[0].scope,    'static', 'The scope should default to "static".');
    });
})();