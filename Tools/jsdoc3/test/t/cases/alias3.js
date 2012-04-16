(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/alias3.js'),
        tcm = docSet.getByLongname('trackr.CookieManager')[0],
        tcmValue = docSet.getByLongname('trackr.CookieManager#value')[0];
    
    test('When a symbol is a member of an aliased class, a this-variables is documented as if it were a member that class.', function() {
        assert.equal(tcmValue.memberof, 'trackr.CookieManager');
    });

})();