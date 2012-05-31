describe("@class tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/classtag.js'),
        ticker = docSet.getByLongname('Ticker')[0],
        news = docSet.getByLongname('NewsSource')[0];

    it('When a symbol has a @class tag, the doclet has a kind property set to "class".', function() {
        expect(ticker.kind).toEqual('class');
    });

    it('When a symbol has a @class tag with a value, the doclet has a name property set to that value.', function() {
        expect(news.kind).toEqual('class');
        expect(news.longname).toEqual('NewsSource');
    });
});