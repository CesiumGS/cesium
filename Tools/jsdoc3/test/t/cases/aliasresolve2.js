(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/aliasresolve2.js'),
        method = docSet.getByLongname('A.F.method');

    test('When a reference in an outer scope has alias, put all members into aliased definition.', function() {
        assert.equal(method.length, 1, 'Local modifications are visible to outside.');
    });
})();