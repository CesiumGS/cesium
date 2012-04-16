(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/readonlytag.js'),
        Collection = docSet.getByLongname('Collection')[0],
        length = docSet.getByLongname('Collection#length')[0];
    
    test('When a symbol has an @readonly tag, the doclet has an readonly property that is true.', function() {
        assert.equal(length.readonly, true);
    });
})();