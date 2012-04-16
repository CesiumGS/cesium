(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/versiontag.js'),
        foo = docSet.getByLongname('foo')[0];
    
    test('When a symbol has an @version tag, the doclet has a version property set to that value.', function() {
        assert.equal(foo.version, '1.2.3');
    });

})();