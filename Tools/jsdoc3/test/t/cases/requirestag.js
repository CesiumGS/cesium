(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/requirestag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0];
    
    test('When a symbol has an @requires tag, the doclet has a requires property that includes that value, with the "module:" namespace added.', function() {
        assert.equal(typeof foo.requires, 'object');
        assert.equal(foo.requires[0], 'module:foo/helper');
        
        assert.equal(typeof bar.requires, 'object');
        assert.equal(bar.requires[0], 'module:foo');
        assert.equal(bar.requires[1], 'module:Pez#blat');
        
    });
})();