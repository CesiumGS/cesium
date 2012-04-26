(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/memberoftag2.js'),
        publish = docSet.getByLongname('Observable#publish')[0],
        cache = docSet.getByLongname('Observable.cache')[0];
    
    test('A symbol is documented as a static @memberof a class.', function() {
        assert.equal(typeof cache, 'object', 'it should appear as a static member of that class.');
        assert.equal(cache.memberof, 'Observable');
        assert.equal(cache.scope, 'static');
        assert.equal(cache.name, 'cache');
        assert.equal(cache.longname, 'Observable.cache');
    });
    
    test('A symbol is documented as a static @memberof a class prototype.', function() {
        assert.equal(typeof publish, 'object', 'it should appear as an instance member of that class.');
        assert.equal(publish.memberof, 'Observable');
        assert.equal(publish.scope, 'instance');
        assert.equal(publish.name, 'publish');
        assert.equal(publish.longname, 'Observable#publish');
    });
})();