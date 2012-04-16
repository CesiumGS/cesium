(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/constructstag.js'),
        textblock = docSet.getByLongname('TextBlock')[0];
    
    test('When a symbol has an @constructs tag, it is documented as a class with that name.', function() {
        assert.equal(textblock.kind, 'class');
        assert.equal(textblock.longname, 'TextBlock');
    });
})();