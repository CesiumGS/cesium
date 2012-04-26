(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/also.js'),
        name = docSet.getByLongname('Asset#name').filter(function($) {
            return ! $.undocumented;
        });
    
    test('When a symbol has two doclets adjacent to each other both doclets apply to the symbol.', function() {
        assert.equal(name.length, 2, 'myObject');
    });
    
})();