(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/moduleinner.js'),
        fooIn = docSet.getByLongname('module:my/module~fooIn')[0],
        fooOut = docSet.getByLongname('module:my/module~fooOut')[0];;
    
    test('When a function appears in the topscope of a module, the symbol is documented as an inner member of that module.', function() {
        assert.equal(typeof fooOut, 'object');
        assert.equal(fooOut.longname, 'module:my/module~fooOut');
        
        assert.equal(typeof fooIn, 'object');
        assert.equal(fooIn.longname, 'module:my/module~fooIn');
    });
    
})();