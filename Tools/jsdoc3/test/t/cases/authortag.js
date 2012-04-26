(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/authortag.js'),
        Thingy = docSet.getByLongname('Thingy')[0];
    
    test('When a symbol has a @author tag, the doclet has a author property with that value.', function() {
        assert.equal(Thingy.author, 'Michael Mathews <micmath@gmail.com>');
    });

})();