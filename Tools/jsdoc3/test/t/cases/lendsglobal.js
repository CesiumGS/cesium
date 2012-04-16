(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/lendsglobal.js'),
        testf = docSet.getByLongname('test')[0],
        test1 = docSet.getByLongname('test1')[0],
        test12 = docSet.getByLongname('test1.test2')[0];
    
    test('When a documented member is inside an objlit associated with a @lends tag that has no value.', function() {
        assert.equal(typeof testf.memberof, 'undefined', 'The members of the objlit are not members of any symbol.');
        assert.equal(testf.longname, 'test', 'The members of the objlit are documented as global.');
        
        
        assert.equal(test12.memberof, 'test1', 'The nested members of the objlit are members of a global symbol.');
    });

})();