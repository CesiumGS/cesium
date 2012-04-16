(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/classtag.js'),
        ticker = docSet.getByLongname('Ticker')[0],
        news = docSet.getByLongname('NewsSource')[0];
    
    test('When a symbol has a @class tag, the doclet has a kind property set to "class".', function() {
        assert.equal(ticker.kind, 'class');
    });
    
    test('When a symbol has a @class tag with a value, the doclet has a name property set to that value.', function() {
        assert.equal(news.kind, 'class');
        assert.equal(news.longname, 'NewsSource');
    });
})();