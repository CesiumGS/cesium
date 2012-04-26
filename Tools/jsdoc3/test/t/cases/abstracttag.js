(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/abstracttag.js'),
        type = docSet.getByLongname('Thingy')[0]
        pez = docSet.getByLongname('Thingy#pez')[0];
    
    test('By default symbol has virtual=undefined property.', function() {
        assert.equal(!!type.virtual, false);
    });
    
    test('When a symbol has a @abstract tag, the doclet has a virtual=true property.', function() {
        assert.equal(pez.virtual, true);
    });
    
    // same as...
    
    pez = docSet.getByLongname('OtherThingy#pez')[0];
    
    test('When a symbol has a @virtual tag, the doclet has a virtual=true property.', function() {
        assert.equal(pez.virtual, true);
    });

})();