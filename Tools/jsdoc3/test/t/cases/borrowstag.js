(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/borrowstag.js'),
        util = docSet.getByLongname('util').filter(function($) {
            return ! $.undocumented;
        })[0];
    
    test('When a symbol has a @borrows-as tag, that is added to the symbol\'s "borrowed" property.', function() {
        assert.equal(util.borrowed.length, 1);
        assert.equal(util.borrowed[0].from, 'trstr');
        assert.equal(util.borrowed[0].as, 'trim');
    });
})();