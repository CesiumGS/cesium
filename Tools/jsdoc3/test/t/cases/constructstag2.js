(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/constructstag2.js'),
        menu = docSet.getByLongname('Menu')[0];
    
    test('When a symbol has an @constructs tag, it is documented as a class.', function() {
        assert.equal(menu.name, 'Menu');
        assert.equal(menu.kind, 'class');
    });
    
})();