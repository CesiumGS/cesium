(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/copyrighttag.js'),
        Thingy = docSet.getByLongname('Thingy')[0];
    
    test('When a symbol has a @copyright tag, the doclet has a copyright property with that value.', function() {
        assert.equal(Thingy.copyright, '(c) 2011 Michael Mathews');
    });

})();