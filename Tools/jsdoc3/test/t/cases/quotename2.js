(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/quotename2.js'),
        found1 = docSet.getByLongname("contacts.\"say-\\\"hello\\\"@example.com\".username")[0];
    
    test('When a key name of a member of an objlit is quoted.', function() {
        assert.equal(found1.name,     'username', 'The short name should be correct.');
        assert.equal(found1.memberof, "contacts.\"say-\\\"hello\\\"@example.com\"", 'The memberof should be correct.');
    });
})();