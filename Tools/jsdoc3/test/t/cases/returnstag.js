(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/returnstag.js'),
        find = docSet.getByLongname('find')[0],
        bind = docSet.getByLongname('bind')[0];
    
    test('When a symbol has an @returns tag with a type and description, the doclet has a returns array that includes that return.', function() {
        assert.equal(typeof find.returns, 'object');
        assert.equal(find.returns.length, 1);
        assert.equal(find.returns[0].type.names.join(', '), 'String, Array<String>');
        assert.equal(find.returns[0].description, 'The names of the found item(s).');
    });
    
    test('When a symbol has an @param tag with only a type and name, the doclet has a returns array property that includes that param.', function() {
        assert.equal(typeof bind.returns, 'object');
        assert.equal(bind.returns.length, 1);
        assert.equal(bind.returns[0].description, 'The binding id.');
    });
    

})();