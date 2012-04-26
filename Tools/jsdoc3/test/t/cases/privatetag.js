(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/privatetag.js'),
        foo = docSet.getByLongname('Foo')[0],
        bar = docSet.getByLongname('Foo#bar')[0];
    
    test('When a symbol has an @private tag, the doclet has an access property that is "private".', function() {
        assert.equal(foo.access, 'private');
    });
})();