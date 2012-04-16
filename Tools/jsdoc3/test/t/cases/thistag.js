(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/thistag.js'),
        setName = docSet.getByLongname('setName')[0],
        fooName = docSet.getByLongname('Foo#name')[0];
    
    test('When a symbol has a @this tag, the doclet has a this property that is set to that value.', function() {
        assert.equal(setName['this'], 'Foo');
    });
    
    test('When a this symbol is documented inside a function with a @this tag, the symbol is documented as a member of that tags value.', function() {
        assert.equal(typeof fooName, 'object');
        assert.equal(fooName.name, 'name');
        assert.equal(fooName.memberof, 'Foo');
        assert.equal(fooName.scope, 'instance');
    });
})();