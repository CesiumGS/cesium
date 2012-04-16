(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/memberoftag.js'),
        Data = docSet.getByLongname('mathlib.Data')[0],
        point = docSet.getByLongname('mathlib.Data#point')[0];
    
    test('When a symbol has an @member tag, the doclet has a long name that includes the parent.', function() {
        assert.equal(typeof Data, 'object');
        assert.equal(typeof point, 'object');
        
        assert.equal(Data.memberof, 'mathlib');
        assert.equal(Data.name, 'Data');
    });
})();