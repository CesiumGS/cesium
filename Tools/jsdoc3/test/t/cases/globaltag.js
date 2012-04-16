(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/globaltag.js'),
        found = docSet.getByLongname('foo').filter(function($) {
            return ! $.undocumented;
        });
    
    test('When an inner symbol has a @global tag it is documented as if it were global.', function() {
        assert.equal(found[0].name, 'foo');
        assert.equal(found[0].longname, 'foo');
        assert.equal(found[0].memberof, undefined);
        assert.equal(found[0].scope, 'global');
        
    });
    
    found = docSet.getByLongname('Bar').filter(function($) {
        return ! $.undocumented;
    });
    
    test('When an nested symbol has a @global tag it is documented as if it were global.', function() {
        assert.equal(found[0].name, 'Bar');
        assert.equal(found[0].longname, 'Bar');
        assert.equal(found[0].memberof, undefined);
        assert.equal(found[0].scope, 'global');
    });

})();