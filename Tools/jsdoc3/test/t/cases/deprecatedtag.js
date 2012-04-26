(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/deprecatedtag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0];
    
    test('When a symbol has a @deprecated tag with no value, the doclet has a deprecated property set to true.', function() {
        assert.equal(foo.deprecated, true);
    });
    
    test('When a symbol has a @deprec tag with a value, the doclet has a deprecated property set to that value.', function() {
        assert.equal(bar.deprecated, 'since version 2.0');
    });

})();