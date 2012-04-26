(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/aliasresolve.js'),
        method = docSet.getByLongname('A.F.method');

    test('When a local reference has alias, put all members into aliased definition.', function() {
        assert.equal(method.length, 1, 'Local modifications are visible to outside.');
    });
})();