(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/variations3.js'),
        someObject = docSet.getByLongname('someObject')[0],
        someObject2 = docSet.getByLongname('someObject(2)')[0],
        someObject2method = docSet.getByLongname('someObject(2).someMethod')[0];
    
    test('When a symbol has a variation tag, the longname includes that variation.', function() {
        assert.equal(someObject2.longname, 'someObject(2)');
    });
    
    test('When a symbol is a member of a variation, the longname includes the variation.', function() {
        assert.equal(someObject2method.longname, 'someObject(2).someMethod');
    });
    
})();