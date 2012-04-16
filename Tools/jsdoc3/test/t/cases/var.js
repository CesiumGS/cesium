(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/var.js'),
        found = [
            docSet.getByLongname('GREEN'),
            docSet.getByLongname('RED'),
            docSet.getByLongname('validate'),
            docSet.getByLongname('i'),
            docSet.getByLongname('results')
        ];
    
    test('When a series of constants are documented.', function() {
        assert.equal(found[0].length, 1, 'The first constant should be found');
        assert.equal(found[0][0].comment, '/** document me */', 'The first constant should get the docs.');
        assert.equal(found[0][0].name,     'GREEN', 'The short name should be correct.');
        assert.equal(found[0][0].memberof, undefined, 'The memberof should be undefined.');
        assert.equal(found[0][0].scope,    'global', 'The scope should be global.');
        
        assert.equal(found[1].length, 1, 'The second constant should be found');
        assert.equal(found[1][0].undocumented, true, 'The second constant should not get the docs.');
    });
    
    test('When member of a series of vars are documented.', function() {
        assert.equal(found[4][0].comment, '/** document me */', 'The correct var should get the docs.');
        assert.equal(found[4][0].name,     'results', 'The short name should be correct.');
        assert.equal(found[4][0].memberof, undefined, 'The memberof should be undefined.');
        assert.equal(found[4][0].scope,    'global', 'The scope should be global.');
    });

})();