(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/inner.js'),
        found1 = docSet.getByLongname('sendMessage~encoding'),
        found2 = docSet.getByLongname('sendMessage~encrypt');
    
    test('When a documented var member is inside a named function.', function() {
        assert.equal(found1.length, 1, 'A doclet with the correct longname should be found.');
        assert.equal(found1[0].name,     'encoding', 'The short name should be correct.');
        assert.equal(found1[0].memberof, 'sendMessage', 'The memberof should be correct.');
        assert.equal(found1[0].scope,    'inner', 'The scope should default to "static".');
    });
    
    test('When a documented function is inside a named function.', function() {
        assert.equal(found2.length, 1, 'A doclet with the correct longname should be found.');
        assert.equal(found2[0].name,     'encrypt', 'The short name should be correct.');
        assert.equal(found2[0].memberof, 'sendMessage', 'The memberof should be correct.');
        assert.equal(found2[0].scope,    'inner', 'The scope should default to "static".');
    });
})();