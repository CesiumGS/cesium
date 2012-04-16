(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/seetag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0];
    
    test('When a symbol has an @see tag, the doclet has a see property that includes that value.', function() {
        assert.equal(typeof foo.see, 'object');
        assert.equal(foo.see[0], '{@link bar}');
        
        assert.equal(typeof bar.see, 'object');
        assert.equal(bar.see[0], 'http://example.com/someref');
    });
})();