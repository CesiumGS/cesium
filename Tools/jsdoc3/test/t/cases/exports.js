(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/exports.js'),
        helloworld = docSet.getByLongname('module:hello/world')[0],
        sayhello = docSet.getByLongname('module:hello/world.sayHello')[0];
    
    test('When a symbol starts with the special name "exports" and is in a file with a @module tag, the symbol is documented as a member of that module.', function() {
        assert.equal(typeof sayhello, 'object');
        assert.equal(sayhello.kind, 'function');
        assert.equal(sayhello.memberof, 'module:hello/world');
    });
})();