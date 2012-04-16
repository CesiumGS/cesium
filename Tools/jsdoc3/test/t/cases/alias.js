(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/alias.js'),
        found = docSet.getByLongname('myObject').filter(function($) {
            return ! $.undocumented;
        }),
        
        foundMember = docSet.getByLongname('myObject.myProperty')
    
    test('When a symbol is given an alias it is documented as if the name is the alias value.', function() {
        assert.equal(found[0].longname, 'myObject');
    });
    
    test('When a symbol is a member of an alias it is documented as if the memberof is the alias value.', function() {
        assert.equal(foundMember[0].longname, 'myObject.myProperty');
        assert.equal(foundMember[0].memberof, 'myObject');
    });

})();