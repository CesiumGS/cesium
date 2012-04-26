(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/this.js'),
        found1 = docSet.getByLongname('Singer#tralala'),
        found2 = docSet.getByLongname('Singer#isSinging');
    
    test('When a member is attached to this in a constructor.', function() {
        assert.equal(found1.length, 1, 'The longname should be like Constructor#member.');
        assert.equal(found1[0].name,     'tralala', 'The short name should be correct.');
        assert.equal(found1[0].memberof, 'Singer', 'The memberof should be correct.');
        assert.equal(found1[0].scope,    'instance', 'The scope should default to "static".');
    });
    
    test('When a member is attached to this in a method of a constructor.', function() {
        assert.equal(found2.length, 1, 'The longname should be like Constructor#member.');
        assert.equal(found2[0].name,     'isSinging', 'The short name should be correct.');
        assert.equal(found2[0].memberof, 'Singer', 'The memberof should be correct.');
        assert.equal(found2[0].scope,    'instance', 'The scope should default to "static".');
    });
})();