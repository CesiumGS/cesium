(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/alias2.js'),
        found = docSet.getByLongname('myObject').filter(function($) {
            return ! $.undocumented;
        }),
        
        foundMember = docSet.getByLongname('ns.Myclass#myProperty')
    
    test('When a symbol is a member of an alias of a nested name it is documented as if the memberof is the nested alias value.', function() {
        assert.equal(foundMember[0].longname, 'ns.Myclass#myProperty');
        assert.equal(foundMember[0].name, 'myProperty');
        assert.equal(foundMember[0].memberof, 'ns.Myclass');
        assert.equal(foundMember[0].scope, 'instance');
    });

})();