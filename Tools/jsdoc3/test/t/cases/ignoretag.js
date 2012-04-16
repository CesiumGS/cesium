(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/ignoretag.js'),
        foo = docSet.getByLongname('foo')[0];
    
    test('When a symbol has an @ignore tag, the doclet has a ignore property set to true.', function() {
        assert.equal(foo.ignore, true);
    });

    try {
        docSet = testhelpers.getDocSetFromFile('test/cases/ignoretag2.js');
        foo = docSet.getByLongname('foo')[0];
    } catch (e) {
        test('When a symbol has an @ignore tag with a value an error is thrown', function() {
            assert.equal(e.name, 'TagValueNotPermittedError');
        });
    }
})();