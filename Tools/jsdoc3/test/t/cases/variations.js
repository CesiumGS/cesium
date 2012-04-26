(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/variations.js'),
        fadein1 = docSet.getByLongname('anim.fadein(1)')[0],
        fadein2 = docSet.getByLongname('anim.fadein(2)')[0];
    
    test('When a symbol has a name with a variation, the doclet has a variation property.', function() {
        assert.equal(fadein1.variation, '1');
        assert.equal(fadein2.variation, '2');
    });
    
    test('When a symbol has a name with a variation in the name, the doclet name has no variation in it.', function() {
        assert.equal(fadein1.name, 'fadein');
        assert.equal(fadein2.name, 'fadein');
    });
    
    test('When a symbol has a name with a variation in the name, the doclet longname has the variation in it.', function() {
        assert.equal(fadein1.longname, 'anim.fadein(1)');
        assert.equal(fadein2.longname, 'anim.fadein(2)');
    });

})();