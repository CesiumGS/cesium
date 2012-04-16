(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/typetag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0];
    
    test('When a symbol has an @type tag, the doclet has a type property set to that value\'s type.', function() {
        assert.equal(typeof foo.type, 'object');
        assert.equal(typeof foo.type.names, 'object');
        assert.equal(foo.type.names.join(', '), 'string, Array<string>');
    });
    
    test('When a symbol has an @type tag set to a plain string, the doclet has a type property set to that string as if it were a type.', function() {
        assert.equal(bar.type.names.join(', '), 'integer');
    });

})();