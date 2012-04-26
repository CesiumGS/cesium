(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/accesstag.js'),
        foo = docSet.getByLongname('Thingy~foo')[0],
        _bar = docSet.getByLongname('Thingy#_bar')[0],
        pez = docSet.getByLongname('Thingy#pez')[0];
    
    test('When a symbol has a @access private tag, the doclet has a access="private" property.', function() {
        assert.equal(foo.access, 'private');
    });
    
    test('When a symbol has a @access protected tag, the doclet has a access="protected" property.', function() {
        assert.equal(_bar.access, 'protected');
    });
    
    test('When a symbol has a @access public tag, the doclet has no access property.', function() {
        assert.equal(typeof pez.access, 'undefined');
    });
    
    // same as...
    
    foo = docSet.getByLongname('OtherThingy~foo')[0];
    _bar = docSet.getByLongname('OtherThingy#_bar')[0];
    pez = docSet.getByLongname('OtherThingy#pez')[0];
    
    test('When a symbol has a @private tag, the doclet has a access="private" property.', function() {
        assert.equal(foo.access, 'private');
    });
    
    test('When a symbol has a @protected tag, the doclet has a access="protected" property.', function() {
        assert.equal(_bar.access, 'protected');
    });
    
    test('When a symbol has a @public tag, the doclet has no access property.', function() {
        assert.equal(typeof pez.access, 'undefined');
    });

})();