(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/memberoftag3.js'),
        forest = docSet.getByLongname('module:terrain.Forest')[0],
        tree = docSet.getByLongname('module:terrain.Forest#Tree')[0],
        leaf = docSet.getByLongname('module:terrain.Forest#Tree#leaf')[0];
    
    test('A symbol that is a nested class with a @memberof tag.', function() {
        assert.equal(tree.longname, 'module:terrain.Forest#Tree');
    });
    
    test('A symbol that is an instance member of a nested class with a @memberof tag.', function() {
        assert.equal(leaf.longname, 'module:terrain.Forest#Tree#leaf');
    });
})();