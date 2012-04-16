(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/this3.js'),
        found = docSet.getByLongname('position');
    
    test('When a this is assigned to inside a non-constructor function.', function() {
        assert.equal(found.length, 1, 'The member name should be global, like "member".');
        assert.equal(found[0].name,     'position', 'The short name should be correct.');
        assert.equal(found[0].memberof, undefined, 'The memberof should be correct.');
    });
  
})();