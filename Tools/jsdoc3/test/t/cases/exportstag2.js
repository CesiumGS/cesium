(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/exportstag2.js'),
        coat = docSet.getByLongname('module:my/coat')[0],
        wool = docSet.getByLongname('module:my/coat#wool')[0];
    
    test('When a function symbol has an @exports tag, the doclet is aliased to "module:" + the tag value.', function() {
        assert.equal(typeof coat, 'object');
        assert.equal(coat.alias, 'my/coat');
    });
    
    test('When a function symbol has an @exports tag, the doclet\'s longname includes the "module:" namespace.', function() {
        assert.equal(coat.longname, 'module:my/coat');
    });
    
    test('When a function symbol has an @exports tag, the doclet kind is set to module.', function() {
        assert.equal(coat.kind, 'module');
    });
    
    test('When a function symbol has an @exports tag, the this members are documented as instance members of the module.', function() {
        assert.equal(typeof wool, 'object');
        assert.equal(wool.memberof, 'module:my/coat');
    });
    
})();