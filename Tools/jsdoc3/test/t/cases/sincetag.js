(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/sincetag.js'),
        foo = docSet.getByLongname('foo')[0];
    
    test('When a symbol has an @since tag, the doclet has a since property set to true.', function() {
        assert.equal(foo.since, '1.2.3');
    });

})();