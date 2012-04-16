(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/objectlit2.js'),
        found = docSet.getByLongname('position.axis.x');
    
    test('When a parent of an objlit has no documentation.', function() {
        assert.equal(found.length, 1, 'A doclet with the correct longname should be found.');
        assert.equal(found[0].name,     'x', 'The short name should be correct.');
        assert.equal(found[0].memberof, 'position.axis', 'The memberof should be correct.');
        assert.equal(found[0].scope,    'static', 'The scope should default to "static".');
    });
})();