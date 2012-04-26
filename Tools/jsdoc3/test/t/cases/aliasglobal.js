(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/aliasglobal.js'),
        log = docSet.getByLongname('log')[0];
    
    test('When a symbol is documented as a static member of <global> it\'s scope is "global" and not "static".', function() {
        assert.equal(log.scope, 'global');
    });

})();