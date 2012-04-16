(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/quotename.js'),
        found1 = docSet.getByLongname('chat.\"#channel\".open')[0];
    
    test('When a member is quoted in square brackets.', function() {
        assert.equal(found1.name,     'open', 'The short name should be correct.');
        assert.equal(found1.memberof, 'chat.\"#channel\"', 'The memberof should be correct.');
    });
})();