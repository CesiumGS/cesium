(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/innerscope2.js'),
        to = docSet.getByLongname('Message~headers.to'),
        from = docSet.getByLongname('<anonymous>~headers.from'),
        cache = docSet.getByLongname('<anonymous>~headers.cache');
    
    test('When a var is declared in a function.', function() {
        assert.equal(cache.length, 1, 'It is like Inner~member.');
    });
    
    test('When a var is masked by an inner var and a member of the inner is documented.', function() {
        assert.equal(from.length, 1, 'It is like Inner~inner.member.');
    });
    
    test('When a documented member is assigned to a var that masks an outer var.', function() {
        assert.equal(from[0].name, 'from');
        assert.equal(from[0].memberof, '<anonymous>~headers');
    });
})();