(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/lends.js'),
        init = docSet.getByLongname('Person#initialize'),
        say = docSet.getByLongname('Person#say'),
        name = docSet.getByLongname('Person#name');
    
    test('When a documented member is inside an objlit associated with a @lends tag.', function() {
        assert.equal(init.length, 1, 'The member should be documented as a member of the lendee.');
        assert.equal(name.length, 1, 'The this member should be documented as a member of the lendee.');
    });

})();