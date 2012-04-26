(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/exportstag.js'),
        shirt = docSet.getByLongname('module:my/shirt')[0],
        color = docSet.getByLongname('module:my/shirt.color')[0],
        tneck = docSet.getByLongname('module:my/shirt.Turtleneck')[0],
        size = docSet.getByLongname('module:my/shirt.Turtleneck#size')[0];
    
    test('When an objlit symbol has an @exports tag, the doclet is aliased to "module:" + the tag value.', function() {
        assert.equal(typeof shirt, 'object');
        assert.equal(shirt.alias, 'my/shirt');
    });
    
    test('When an objlit symbol has an @exports tag, the doclet\'s longname includes the "module:" namespace.', function() {
        assert.equal(shirt.longname, 'module:my/shirt');
    });
    
    test('When an objlit symbol has an @exports tag, the doclet kind is set to module.', function() {
        assert.equal(shirt.kind, 'module');
    });
    
    test('When an objlit symbol has an @exports tag, the objlit members are documented as members of the module.', function() {
        assert.equal(typeof color, 'object');
        assert.equal(color.memberof, 'module:my/shirt');
        
        assert.equal(typeof tneck, 'object');
        assert.equal(typeof size, 'object');
    });
    
})();