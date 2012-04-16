(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/exceptiontag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0],
        pez = docSet.getByLongname('pez')[0];
    
    test('When a symbol has an @exception tag, the doclet has a exception property set to that value.', function() {
        assert.equal(typeof foo.exceptions, 'object');
        assert.equal(foo.exceptions.length, 1);
        
        assert.equal(typeof bar.exceptions, 'object');
        assert.equal(bar.exceptions.length, 1);
        
        assert.equal(typeof pez.exceptions, 'object');
        assert.equal(pez.exceptions.length, 1);
    });

})();