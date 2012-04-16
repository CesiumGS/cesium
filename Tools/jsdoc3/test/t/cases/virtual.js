(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/virtual.js'),
        found = [
            docSet.getByLongname('dimensions'),
            docSet.getByLongname('width')
        ];
    
    test('When a virtual symbol is documented.', function() {
        assert.equal(found[0].length, 1, 'The symbol should be documented');
    });
    
    test('When an undocumented is after a comment for a virtual symbol is documented.', function() {
        assert.equal(found[1].length, 1, 'The symbol should be documented');
    });

})();