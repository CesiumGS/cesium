(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/typedeftag.js'),
        numberlike = docSet.getByLongname('calc.NumberLike')[0];
    
    test('When a symbol has an @typedef tag, the doclet has a kind property set to "typedef".', function() {
        assert.equal(numberlike.kind, 'typedef');
    });
    
    test('When a symbol has an @typedef tag with a type, the doclet has a type property set to that type.', function() {
        assert.equal(typeof numberlike.type, 'object');
        assert.equal(typeof numberlike.type.names, 'object');
        assert.equal(numberlike.type.names.length, 2);
        assert.equal(numberlike.type.names[0], 'string');
        assert.equal(numberlike.type.names[1], 'number');
    });
    
    test('When a symbol has an @typedef tag with a name, the doclet has a name property set to that name.', function() {
        assert.equal(numberlike.name, 'NumberLike');
        assert.equal(numberlike.longname, 'calc.NumberLike');
    });

})();